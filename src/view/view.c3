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
	sz slot_w, slot_h; // the panel's share of the window as last solved, points
	sz iw, ih;         // the size the image is shown at, to fit its slot
	sz cap_h;          // caption height under the image, points
}

struct Model {
	Panel[MAX_IMAGES] panels;
	sz n;
	String prompt;
	int layout_tries; // frames redrawn in a row to settle the layout
}

// caption_h is the caption's height for an image w points wide.
fn sz Panel.caption_h(&self, sz w) {
	if (!self.title.len && !self.desc.len) return 0;
	sz cols = math::max((w - 2 * CAP_PAD_X) / avt::CELL_W, (sz)4);
	sz lines = 0;
	if (self.title.len) lines += glaze::wrapped_line_count(self.title, cols);
	if (self.desc.len) lines += glaze::wrapped_line_count(self.desc, cols);
	return lines * avt::CELL_H + 2 * CAP_PAD;
}

// fit sizes the image to its slot, keeping its shape, with room for the
// caption under it (whose height depends on the image's width).
fn void Panel.fit(&self) {
	float ox, oy, dw, dh;
	sz cap = self.caption_h(self.slot_w);
	for (int pass = 0; pass < 2; pass++) {
		sz room = math::max(self.slot_h - cap, (sz)20);
		self.img.placement(CONTAIN, (float)self.slot_w, (float)room, &ox, &oy, &dw, &dh);
		sz again = self.caption_h((sz)dw);
		if (again <= cap) break;
		cap = again;
	}
	self.cap_h = cap;
	self.iw = math::max((sz)dw, (sz)1);
	self.ih = math::max((sz)dh, (sz)1);
}

// read_layout picks up each slot's solved size from the click targets (a
// slot is tagged with ref(&slot_w)) and refits the images that changed.
fn void Model.read_layout(&self) {
	bool refit = false;
	foreach (t : milktea::g_program.click_targets.array_view()) {
		for (sz i = 0; i < self.n; i++) {
			Panel* p = &self.panels[i];
			if (t.id_ptr == &p.slot_w && (t.rect.w != p.slot_w || t.rect.h != p.slot_h)) {
				p.slot_w = t.rect.w;
				p.slot_h = t.rect.h;
				p.fit();
				refit = true;
			}
		}
	}
	for (sz i = 0; i < self.n; i++) if (!self.panels[i].slot_w) refit = true;
	if (refit && self.layout_tries++ < 4) milktea::request_redraw();
	if (!refit) self.layout_tries = 0;
}

fn milktea::Node* spacer(sz w) => milktea::vstack().width(xray::pixels(w));

fn milktea::Node* Panel.card(&self) {
	milktea::Node* card = milktea::vstack().width(xray::pixels(self.iw))
		.add(xray::image(self.img, STRETCH).height(xray::pixels(self.ih)));
	if (self.cap_h) {
		milktea::Node* text = milktea::vstack().fill(1);
		if (self.title.len) text.add(milktea::text(self.title, glaze::style().foreground(avt::rgb(avt::INK)).with_bold(true)));
		if (self.desc.len) text.add(milktea::text(self.desc, glaze::style().foreground(avt::rgb(avt::MUTED))));
		card.add(milktea::vstack().height(xray::pixels(self.cap_h))
			.add(milktea::vstack().height(xray::pixels(CAP_PAD)))
			.add(milktea::hstack().fill(1).add(spacer(CAP_PAD_X)).add(text).add(spacer(CAP_PAD_X))));
	}
	card.decorate(xray::solid(avt::rgb(avt::CARD)).round(10).with_border(1, avt::rgb(avt::EDGE)));
	// The pointer shape keeps the slot as a click target, with its rect.
	return milktea::vstack().fill(1)
		.with_justify(xray::JustifyContent.JUSTIFY_CENTER)
		.with_align(xray::AlignItems.ALIGN_CENTER)
		.ref(&self.slot_w).pointer(xray::PointerShape.ARROW)
		.add(self.iw > 1 ? card : milktea::vstack());
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
	self.read_layout();
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
