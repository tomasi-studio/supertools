// pointer: lets the user draw with the pointer over one to four images and
// prints the strokes as JSON, in each image's own pixel coordinates. Enter
// or "Done" finishes; Esc cancels: nothing is printed and the exit code is 1.
module pointer;

import supertools;
import milktea;
import xray;
import glaze;
import std::io;
import std::math;
import std::core::dstring;
import std::core::string;
import std::os::env;
import std::collections::list;
import libc;

const sz MAX_IMAGES = 4;

const float BRUSH = 3.0f; // stroke radius, points on screen

const float STEP = 2.0f; // least move that adds a point, points on screen

const double CLICK = 8.0; // a stroke smaller than this is a click, points on screen

// Layout, points
const sz PAD = 30;

const sz GAP = 12;

const sz FOOTER_H = 60;

const sz DOT = 22;

const sz DOT_GAP = 10;

struct Swatch {
	String name;
	uint hex;
}

const Swatch[5] SWATCHES = {
	{ "black", 0x000000 },
	{ "white", 0xffffff },
	{ "red", 0xff3b30 },
	{ "yellow", 0xffd60a },
	{ "cyan", 0x32d6ff },
};

struct Point {
	float x, y; // work image pixels
}

struct Stroke {
	sz panel;
	sz color;
	List{Point} points;
}

struct Panel {
	String path;
	sz width, height; // the file's own size
	xray::Image* img; // what is shown and drawn on, at most WORK_MAX across
	char[] base; // img's pixels with nothing drawn
	String title; // optional caption under the image
	String desc;
	float iw; // the width the image was last shown at, points
}

const sz CAP_PAD = 10; // above and below a caption, points

const sz CAP_PAD_X = 12;

struct Model {
	Panel[MAX_IMAGES] panels;
	sz n;
	List{Stroke} strokes;
	String prompt;
	sz color;
	bool drawing;
	bool points; // print every stroke's points too
	float last_x, last_y; // last point added, points on screen
}

Model* g_model;

// press starts a stroke on panel i at (x, y), local to its image.
fn void Model.press(&self, sz i, float x, float y) {
	Stroke s = { .panel = i, .color = self.color };
	s.points.init(mem); // outlives the frame's temp pool
	s.points.push(self.panels[i].to_work(x, y));
	self.strokes.push(s);
	self.paint_segment(&self.strokes[^1], 0);
	self.drawing = true;
	self.last_x = x;
	self.last_y = y;
}

fn void Model.drag(&self, float x, float y) {
	if (!self.drawing) return;
	float dx = x - self.last_x;
	float dy = y - self.last_y;
	if (dx * dx + dy * dy < STEP * STEP) return;
	Stroke* s = &self.strokes[^1];
	s.points.push(self.panels[s.panel].to_work(x, y));
	self.paint_segment(s, s.points.len() - 1);
	self.last_x = x;
	self.last_y = y;
}

fn void image_pressed(void* id, String id_str, sz col, sz row) {
	g_model.press((Panel*)id - &g_model.panels[0], (float)xray::event_px(), (float)xray::event_py());
}

fn void image_dragged(void* id, String id_str, sz col, sz row) {
	g_model.drag((float)xray::event_px(), (float)xray::event_py());
}

fn void Model.undo(&self) {
	if (self.strokes.len() == 0) return;
	self.drawing = false;
	Stroke s = self.strokes.pop()!!;
	s.points.free();
	self.repaint();
}

fn void Model.clear(&self) {
	self.drawing = false;
	foreach (&s : self.strokes) s.points.free();
	self.strokes.clear();
	self.repaint();
}

fn void done_clicked(void* id, String id_str, sz col, sz row) => g_model.finish();

fn void undo_clicked(void* id, String id_str, sz col, sz row) => g_model.undo();

fn void clear_clicked(void* id, String id_str, sz col, sz row) => g_model.clear();

fn void swatch_clicked(void* id, String id_str, sz col, sz row) => g_model.color = (sz)(uptr)id;

fn milktea::Node* spacer(sz w) => milktea::vstack().width(xray::pixels(w));

fn milktea::Node* Model.swatch(&self, sz i) {
	bool on = i == self.color;
	xray::Decoration d = xray::solid(supertools::rgb(SWATCHES[i].hex)).round((float)DOT / 2)
		.with_border(1, supertools::rgba(0xffffff, 60));
	if (on) d = d.with_shadow(0, 0, 0, supertools::rgb(supertools::ACCENT), 3);
	return milktea::vstack().width(xray::pixels(DOT)).height(xray::pixels(DOT)).decorate(d).ref_index(i)
		.pointer(xray::PointerShape.HAND)
		.on_click(&swatch_clicked);
}

// card is a panel's share of the row: the image, as big as fits keeping its
// shape, with the caption under it. The image takes presses and drags.
fn milktea::Node* Panel.card(&self) {
	milktea::Node* card = milktea::vstack().fill(1)
		.decorate(xray::solid(supertools::rgb(supertools::CARD)).round(10)
			.with_border(1, supertools::rgb(supertools::EDGE)))
		.add(xray::image(self.img, CONTAIN).fill(1).ref(self).on_click(&image_pressed).on_drag(&image_dragged));
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

fn milktea::Cmd Model.init(&self) @dynamic {
	return null;
}

fn milktea::Cmd Model.update(&self, milktea::Msg msg) @dynamic {
	switch (msg.kind) {
		case WINDOW_SIZE:
			milktea::request_redraw();
		case KEY:
			milktea::KeyMsg k = msg.key;
			switch (k.code) {
				case ESC:
				case CTRL_C: libc::exit(1);
				case ENTER: self.finish();
				case BACKSPACE: self.undo();
				case RUNE:
					switch {
						case k.rune == 'z' && (k.super || k.ctrl): self.undo();
						case k.rune == 'u': self.undo();
						case k.rune == 'c': self.clear();
						case k.rune == 'q': libc::exit(1);
						case k.rune >= '1' && k.rune <= '5': self.color = (sz)(k.rune - '1');
					}
				default:
			}
		case MOUSE:
			// Presses and drags arrive through the image nodes' hooks.
			if (msg.mouse.action == MOUSE_RELEASE) self.drawing = false;
		default:
	}
	return null;
}

fn milktea::Node* Model.view(&self) @dynamic {
	String hint = "Draw on the images  ·  1-5 colour  ·  u undo  ·  c clear  ·  enter done  ·  esc cancel";
	milktea::Node* top = milktea::hstack().add(spacer(PAD)).add(supertools::header(self.prompt, hint).fill(1))
		.add(spacer(PAD));

	milktea::Node* canvas = milktea::vstack().fill(1);
	sz per_row            = self.n == 4 ? 2 : self.n;
	for (sz r = 0; r * per_row < self.n; r++) {
		if (r) canvas.add(milktea::vstack().height(xray::pixels(GAP)));
		milktea::Node* row = milktea::hstack().fill(1).add(spacer(PAD));
		for (sz c = 0; c < per_row && r * per_row + c < self.n; c++) {
			Panel* p = &self.panels[r * per_row + c];
			if (c) row.add(spacer(GAP));
			row.add(p.card());
		}
		canvas.add(row.add(spacer(PAD)));
	}

	milktea::Node* dots = milktea::hstack().with_align(xray::AlignItems.ALIGN_CENTER);
	for (sz i = 0; i < SWATCHES.len; i++) {
		if (i) dots.add(spacer(DOT_GAP));
		dots.add(self.swatch(i));
	}
	milktea::Node* foot = milktea::hstack().height(xray::pixels(FOOTER_H)).with_align(xray::AlignItems.ALIGN_CENTER)
		.add(spacer(PAD))
		.add(dots)
		.add(milktea::vstack().fill(1))
		.add(supertools::button("Undo", &undo_clicked))
		.add(spacer(8))
		.add(supertools::button("Clear", &clear_clicked))
		.add(spacer(8))
		.add(supertools::button("Done", &done_clicked, primary: true))
		.add(spacer(PAD));

	return milktea::vstack().decorate(supertools::background()).add(top).add(canvas).add(foot);
}
