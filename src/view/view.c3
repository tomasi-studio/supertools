// view: shows one to four images, with optional captions, until the user
// closes the window. Prints nothing.
module view;

import avt;
import milktea;
import xray;
import glaze;
import std::io;
import std::math;
import std::collections::list;
import libc;

const sz MAX_IMAGES = 4;

// Layout, points
const sz PAD = 30;
const sz GAP = 12;
const sz CAP_PAD = 10; // above and below a caption
const sz CAP_PAD_X = 12;

struct Panel {
	xray::Image* img;
	String title; // optional caption under the image
	String desc;
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
		.decorate(xray::solid(avt::rgb(avt::CARD)).round(10).with_border(1, avt::rgb(avt::EDGE)))
		.add(xray::image(self.img, CONTAIN).fill(1));
	if (self.title.len || self.desc.len) {
		milktea::Node* text = milktea::vstack().fill(1);
		if (self.title.len) text.add(milktea::text(self.title, glaze::style().foreground(avt::rgb(avt::INK)).with_bold(true)));
		if (self.desc.len) text.add(milktea::text(self.desc, glaze::style().foreground(avt::rgb(avt::MUTED))));
		card.add(milktea::vstack().height(xray::pixels(CAP_PAD)))
			.add(milktea::hstack().add(spacer(CAP_PAD_X)).add(text).add(spacer(CAP_PAD_X)))
			.add(milktea::vstack().height(xray::pixels(CAP_PAD)));
	}
	return card;
}

fn milktea::Cmd Model.init(&self) @dynamic {
	return null;
}

fn milktea::Cmd Model.update(&self, milktea::Msg msg) @dynamic {
	switch (msg.kind) {
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
	sz per_row = self.n == 4 ? 2 : self.n;
	for (sz r = 0; r * per_row < self.n; r++) {
		if (r) canvas.add(milktea::vstack().height(xray::pixels(GAP)));
		milktea::Node* row = milktea::hstack().fill(1).add(spacer(PAD));
		for (sz c = 0; c < per_row && r * per_row + c < self.n; c++) {
			if (c) row.add(spacer(GAP));
			row.add(self.panels[r * per_row + c].card());
		}
		canvas.add(row.add(spacer(PAD)));
	}
	return milktea::vstack()
		.decorate(avt::background())
		.add(milktea::hstack()
			.add(spacer(PAD))
			.add(avt::header(self.prompt, "esc, enter or space to close").fill(1))
			.add(spacer(PAD)))
		.add(canvas)
		.add(milktea::vstack().height(xray::pixels(PAD)));
}

fn void usage() {
	io::eprintn(`usage: mcpane view [options] IMAGE [--label S] [--desc S]...
Shows one to four images (layouts 1, 1-2, 1-2-3, 2x2) until Esc, Enter or
Space closes the window. Prints nothing.

options:
  --prompt S    heading shown above the images
  --title S     window title (default "View")
  --label S     caption title for the image before it
  --desc S      caption text for the image before it`);
}

// run is `mcpane view`: args[0] is the subcommand, options follow.
fn int run(String[] args) {
	Model m;
	String title = "View";
	for (sz i = 1; i < args.len; i++) {
		String a = args[i];
		sz left = args.len - i - 1;
		switch {
			case a == "--prompt" && left >= 1:
				m.prompt = args[++i];
			case a == "--title" && left >= 1:
				title = args[++i];
			case a == "--label" && left >= 1 && m.n > 0:
				m.panels[m.n - 1].title = args[++i];
			case a == "--desc" && left >= 1 && m.n > 0:
				m.panels[m.n - 1].desc = args[++i];
			case a.starts_with("--") || m.n == MAX_IMAGES:
				usage();
				return 2;
			default:
				m.panels[m.n++].img = avt::load_image(a) ?? avt::placeholder();
		}
	}
	if (m.n == 0) {
		usage();
		return 2;
	}
	int cols = m.n == 3 ? 150 : 110;
	int rows = m.n == 4 ? 50 : m.n == 3 ? 34 : 42;
	avt::run((milktea::Model)&m, title, cols, rows);
	return 0;
}
