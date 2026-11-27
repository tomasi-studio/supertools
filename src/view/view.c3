// view: shows one to four images, with optional captions, until the user
// closes the window. Prints nothing.
module view;

import supertools;
import milktea;
import xray;
import glaze;
import std::io;
import std::math;
import std::collections::list;
import libc;

const sz MAX_IMAGES = 4;

// Layout, points
const sz PAD       = 30;
const sz GAP       = 12;
const sz CAP_PAD   = 10; // above and below a caption
const sz CAP_PAD_X = 12;

struct Panel {
	xray::Image* img;
	String title; // optional caption under the image
	String desc;
	supertools::Gif gif; // frames to cycle through, when the file is an animated GIF
	sz frame;
	sz due;              // frame_ms() at which the next frame shows
}

struct Model {
	Panel[MAX_IMAGES] panels;
	sz n;
	String prompt;
}

fn milktea::Node* spacer(sz w) => milktea::vstack().width(xray::pixels(w));

// card is a panel's share of the row: the image, as big as fits keeping its
// shape, with the caption under it.
fn milktea::Node* Panel.card(&self) {
	milktea::Node* card = milktea::vstack().fill(1)
		.decorate(xray::solid(supertools::rgb(supertools::CARD)).round(10)
			.with_border(1, supertools::rgb(supertools::EDGE)))
		.add(xray::image(self.img, CONTAIN).fill(1));
	if (self.title.len || self.desc.len) {
		milktea::Node* text = milktea::vstack().fill(1);
		if (self.title.len) text.add(milktea::text(self.title, glaze::style()
			.foreground(supertools::rgb(supertools::INK))
			.with_bold(true)));
		if (self.desc.len) text.add(milktea::text(self.desc, glaze::style()
			.foreground(supertools::rgb(supertools::MUTED))));
		card.add(milktea::vstack().height(xray::pixels(CAP_PAD)))
			.add(milktea::hstack().add(spacer(CAP_PAD_X)).add(text).add(spacer(CAP_PAD_X)))
			.add(milktea::vstack().height(xray::pixels(CAP_PAD)));
	}
	return card;
}

// load fills the panel from a file: an animated GIF plays, anything else
// shows still.
fn void Panel.load(&self, String path) {
	if (try g = supertools::load_gif(path)) {
		self.gif = g;
		self.img = xray::new_image(g.frames[:g.width * g.height * 4], g.width, g.height);
		return;
	}
	self.img = supertools::load_image(path) ?? supertools::placeholder();
}

fn bool Model.animated(&self) {
	for (sz i = 0; i < self.n; i++) if (self.panels[i].gif.count) return true;
	return false;
}

// advance moves every GIF on to the frame its time calls for.
fn void Model.advance(&self) {
	sz now = milktea::frame_ms();
	for (sz i = 0; i < self.n; i++) {
		Panel* p = &self.panels[i];
		supertools::Gif* g = &p.gif;
		if (!g.count) continue;
		if (!p.due) p.due = now + g.delays[p.frame];
		sz steps = 0;
		while (now >= p.due && steps++ < g.count) {
			p.frame = (p.frame + 1) % g.count;
			p.due += g.delays[p.frame];
		}
		if (now >= p.due) p.due = now + g.delays[p.frame]; // far behind: skip ahead
		if (steps) {
			sz size = g.width * g.height * 4;
			p.img.set_pixels(g.frames[p.frame * size:size]);
		}
	}
}

fn milktea::Cmd Model.init(&self) @dynamic {
	return self.animated() ? milktea::tick(10) : null;
}

fn milktea::Cmd Model.update(&self, milktea::Msg msg) @dynamic {
	switch (msg.kind) {
		case TICK:
			self.advance();
			milktea::request_redraw();
			return milktea::tick(10);
		case WINDOW_SIZE:
			milktea::request_redraw();
		case KEY:
			milktea::KeyMsg k = msg.key;
			switch {
				case k.code == ESC || k.code == ENTER || k.code == CTRL_C:
				case k.code == RUNE && (k.rune == 'q' || k.rune == ' '):
					libc::exit(0);
			}
		default:
	}
	return null;
}

fn milktea::Node* Model.view(&self) @dynamic {
	milktea::Node* canvas = milktea::vstack().fill(1);
	sz per_row            = self.n == 4 ? 2 : self.n;
	for (sz r = 0; r * per_row < self.n; r++) {
		if (r) canvas.add(milktea::vstack().height(xray::pixels(GAP)));
		milktea::Node* row = milktea::hstack().fill(1).add(spacer(PAD));
		for (sz c = 0; c < per_row && r * per_row + c < self.n; c++) {
			if (c) row.add(spacer(GAP));
			row.add(self.panels[r * per_row + c].card());
		}
		canvas.add(row.add(spacer(PAD)));
	}
	return milktea::vstack().decorate(supertools::background())
		.add(milktea::hstack().add(spacer(PAD))
			.add(supertools::header(self.prompt, "esc, enter or space to close").fill(1))
			.add(spacer(PAD)))
		.add(canvas)
		.add(milktea::vstack().height(xray::pixels(PAD)));
}
