// pointer: lets the user draw with the pointer over one to four images and
// prints the strokes as JSON, in each image's own pixel coordinates. Enter
// or "Done" finishes; Esc cancels: nothing is printed and the exit code is 1.
module pointer;

import avt;
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
const sz WORK_MAX = 1600;  // longest side images are drawn on at, pixels
const float BRUSH = 3.0f;  // stroke radius, points on screen
const float STEP = 2.0f;   // least move that adds a point, points on screen
const double CLICK = 8.0;  // a stroke smaller than this is a click, points on screen

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
	char[] base;      // img's pixels with nothing drawn
	String title;     // optional caption under the image
	String desc;
	sz slot_w, slot_h; // the panel's share of the window as last solved, points
	sz iw, ih;         // the size the image is shown at, to fit its slot
	sz cap_h;          // caption height under the image, points
}

const sz CAP_PAD = 10; // above and below a caption, points
const sz CAP_PAD_X = 12;

// caption_h is the caption's height for an image w points wide.
fn sz Panel.caption_h(&self, sz w) {
	if (!self.title.len && !self.desc.len) return 0;
	sz cols = (w - 2 * CAP_PAD_X) / avt::CELL_W;
	if (cols < 4) cols = 4;
	sz lines = 0;
	if (self.title.len) lines += glaze::wrapped_line_count(self.title, cols);
	if (self.desc.len) lines += glaze::wrapped_line_count(self.desc, cols);
	return lines * avt::CELL_H + 2 * CAP_PAD;
}

struct Model {
	Panel[MAX_IMAGES] panels;
	sz n;
	List{Stroke} strokes;
	String prompt;
	sz color;
	bool drawing;
	bool points; // print every stroke's points too
	int layout_tries; // frames redrawn in a row to settle the layout
	float last_x, last_y; // last point added, points on screen
}

Model* g_model;

// fit sizes the image to its slot: as big as it goes while keeping its
// shape, with room for the caption under it. The caption's height depends
// on the image's width, which depends on the room the caption leaves. (The
// layout has no aspect-fit constraint, so this part is ours.)
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

// read_layout picks up each slot's size as the last frame solved it, from
// the click targets (a slot is tagged with ref(&slot_w)). A slot that
// changed size refits its image and asks for another frame.
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
	// The first frame has nothing solved yet: draw again once it has.
	for (sz i = 0; i < self.n; i++) if (!self.panels[i].slot_w) refit = true;
	if (refit && self.layout_tries++ < 4) milktea::request_redraw();
	if (!refit) self.layout_tries = 0;
}

// to_work turns a point local to the panel's image node into work image
// pixels, clamped to the image.
fn Point Panel.to_work(&self, float x, float y) {
	float k = (float)self.img.width / (float)self.iw;
	return { math::clamp(x * k, 0.0f, (float)self.img.width - 1), math::clamp(y * k, 0.0f, (float)self.img.height - 1) };
}

// stamp paints a round-capped line from a to b, radius r, in work pixels.
fn void Panel.stamp(&self, Point a, Point b, float r, uint hex) {
	xray::Image* img = self.img;
	sz x0 = (sz)math::max(0.0f, math::min(a.x, b.x) - r - 1);
	sz y0 = (sz)math::max(0.0f, math::min(a.y, b.y) - r - 1);
	sz x1 = (sz)math::min((float)img.width - 1, math::max(a.x, b.x) + r + 1);
	sz y1 = (sz)math::min((float)img.height - 1, math::max(a.y, b.y) + r + 1);
	float dx = b.x - a.x;
	float dy = b.y - a.y;
	float len2 = dx * dx + dy * dy;
	char cr = (char)(hex >> 16);
	char cg = (char)(hex >> 8);
	char cb = (char)hex;
	for (sz y = y0; y <= y1; y++) {
		for (sz x = x0; x <= x1; x++) {
			float px = (float)x + 0.5f - a.x;
			float py = (float)y + 0.5f - a.y;
			float t = len2 > 0 ? math::clamp((px * dx + py * dy) / len2, 0.0f, 1.0f) : 0.0f;
			float ex = px - t * dx;
			float ey = py - t * dy;
			float cov = math::clamp(r + 0.5f - math::sqrt(ex * ex + ey * ey), 0.0f, 1.0f);
			if (cov <= 0) continue;
			char* o = &img.rgba[(y * img.width + x) * 4];
			o[0] = (char)(o[0] + (cr - (float)o[0]) * cov);
			o[1] = (char)(o[1] + (cg - (float)o[1]) * cov);
			o[2] = (char)(o[2] + (cb - (float)o[2]) * cov);
			o[3] = (char)(o[3] + (255 - (float)o[3]) * cov);
		}
	}
	img.version++;
	milktea::request_redraw();
}

fn float Panel.brush(&self) => BRUSH * (float)self.img.width / (float)math::max(self.iw, (sz)1);

fn void Model.paint_segment(&self, Stroke* s, sz from) {
	Panel* p = &self.panels[s.panel];
	Point a = s.points[from == 0 ? 0 : from - 1];
	p.stamp(a, s.points[from], p.brush(), SWATCHES[s.color].hex);
}

// repaint draws every panel again from its base: after an undo or a clear,
// or when a resize changes the brush size.
fn void Model.repaint(&self) {
	for (sz i = 0; i < self.n; i++) {
		Panel* p = &self.panels[i];
		p.img.rgba[..] = p.base[..];
		p.img.version++;
	}
	milktea::request_redraw();
	foreach (&s : self.strokes) {
		for (sz j = 0; j < s.points.len(); j++) self.paint_segment(s, j);
	}
}

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

// orig turns a work image point into the file's own pixels.
fn long[2] Panel.orig(&self, Point pt) {
	return { (long)math::round(pt.x * (float)self.width / (float)self.img.width),
		(long)math::round(pt.y * (float)self.height / (float)self.img.height) };
}

// describe appends a stroke's summary: what it looks like (a click, a line
// a curve or a loop), its bounds, and its points if asked for.
fn void Model.describe(&self, DString* out, Stroke* s) {
	Panel* p = &self.panels[s.panel];
	long[2] first = p.orig(s.points[0]);
	long[2] last = p.orig(s.points[^1]);
	long x0 = first[0];
	long y0 = first[1];
	long x1 = x0;
	long y1 = y0;
	double len = 0;
	long[2] prev = first;
	foreach (pt : s.points) {
		long[2] o = p.orig(pt);
		x0 = math::min(x0, o[0]); y0 = math::min(y0, o[1]);
		x1 = math::max(x1, o[0]); y1 = math::max(y1, o[1]);
		len += math::sqrt((double)((o[0] - prev[0]) * (o[0] - prev[0]) + (o[1] - prev[1]) * (o[1] - prev[1])));
		prev = o;
	}
	double per_pt = (double)p.width / (double)p.iw; // file pixels per screen point
	double extent = (double)math::max(x1 - x0, y1 - y0);
	double gap = math::sqrt((double)((last[0] - first[0]) * (last[0] - first[0]) + (last[1] - first[1]) * (last[1] - first[1])));
	String kind = "line";
	if (extent < CLICK * per_pt) {
		kind = "click";
	} else if (gap < 0.4 * extent && len > 1.5 * extent) {
		kind = "loop"; // closed, or close enough: circling something
	} else if (len > 1.3 * gap) {
		kind = "curve";
	}
	out.appendf(`{"image":%d,"color":"%s","kind":"%s"`, s.panel, SWATCHES[s.color].name, kind);
	switch (kind) {
		case "click": out.appendf(`,"at":[%d,%d]`, (x0 + x1) / 2, (y0 + y1) / 2);
		case "line":
		case "curve": out.appendf(`,"from":[%d,%d],"to":[%d,%d]`, first[0], first[1], last[0], last[1]);
	}
	out.appendf(`,"bbox":[%d,%d,%d,%d]`, x0, y0, x1 - x0, y1 - y0);
	if (self.points) {
		out.append(`,"points":[`);
		foreach (j, pt : s.points) {
			long[2] o = p.orig(pt);
			if (j) out.append(',');
			out.appendf("[%d,%d]", o[0], o[1]);
		}
		out.append(']');
	}
	out.append('}');
}

extern fn CInt getpid();

// finish writes each marked-up image as a PNG, prints the summary, and exits.
fn void Model.finish(&self) {
	String dir = env::tget_var("TMPDIR") ?? "/tmp";
	if (dir.ends_with("/")) dir = dir[:^1];
	DString out;
	out.append(`{"images":[`);
	for (sz i = 0; i < self.n; i++) {
		Panel* p = &self.panels[i];
		if (i) out.append(',');
		out.append(`{"path":`);
		avt::json_str(&out, p.path);
		out.appendf(`,"width":%d,"height":%d`, p.width, p.height);
		bool marked = false;
		foreach (&s : self.strokes) if (s.panel == i) marked = true;
		if (marked) {
			String png = string::tformat("%s/pointer-%d-%d.png", dir, getpid(), i);
			if (avt::write_png(png, p.img)) {
				out.append(`,"marked":`);
				avt::json_str(&out, png);
			}
		}
		out.append('}');
	}
	out.append(`],"strokes":[`);
	foreach (k, &s : self.strokes) {
		if (k) out.append(',');
		self.describe(&out, s);
	}
	out.append("]}");
	io::printn(out.str_view());
	(void)io::stdout().flush();
	libc::exit(0);
}

fn void done_clicked(void* id, String id_str, sz col, sz row) => g_model.finish();
fn void undo_clicked(void* id, String id_str, sz col, sz row) => g_model.undo();
fn void clear_clicked(void* id, String id_str, sz col, sz row) => g_model.clear();
fn void swatch_clicked(void* id, String id_str, sz col, sz row) => g_model.color = (sz)(uptr)id;

fn milktea::Node* spacer(sz w) => milktea::vstack().width(xray::pixels(w));

fn milktea::Node* Model.swatch(&self, sz i) {
	bool on = i == self.color;
	xray::Decoration d = xray::solid(avt::rgb(SWATCHES[i].hex)).round((float)DOT / 2)
		.with_border(1, avt::rgba(0xffffff, 60));
	if (on) d = d.with_shadow(0, 0, 0, avt::rgb(avt::ACCENT), 3);
	return milktea::vstack()
		.width(xray::pixels(DOT)).height(xray::pixels(DOT))
		.decorate(d)
		.ref_index(i)
		.pointer(xray::PointerShape.HAND)
		.on_click(&swatch_clicked);
}

// card is a panel: a slot that takes its share of the row, with the image
// and its caption centred in it. The image takes presses and drags; the
// slot is tagged, and given a pointer shape so it is kept as a click target
// with its solved rect (see read_layout).
fn milktea::Node* Panel.card(&self) {
	milktea::Node* image = xray::image(self.img, STRETCH).height(xray::pixels(self.ih));
	image.ref(self).on_click(&image_pressed).on_drag(&image_dragged);
	milktea::Node* card = milktea::vstack().width(xray::pixels(self.iw)).add(image);
	if (self.cap_h) {
		milktea::Node* text = milktea::vstack().fill(1);
		if (self.title.len) text.add(milktea::text(self.title, glaze::style().foreground(avt::rgb(avt::INK)).with_bold(true)));
		if (self.desc.len) text.add(milktea::text(self.desc, glaze::style().foreground(avt::rgb(avt::MUTED))));
		card.add(milktea::vstack().height(xray::pixels(self.cap_h))
			.add(milktea::vstack().height(xray::pixels(CAP_PAD)))
			.add(milktea::hstack().fill(1).add(spacer(CAP_PAD_X)).add(text).add(spacer(CAP_PAD_X))));
	}
	card.decorate(xray::solid(avt::rgb(avt::CARD)).round(10).with_border(1, avt::rgb(avt::EDGE)));
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
			milktea::request_redraw(); // slots resize; read_layout refits
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
	self.read_layout();
	String hint = "Draw on the images  ·  1-5 colour  ·  u undo  ·  c clear  ·  enter done  ·  esc cancel";
	milktea::Node* top = milktea::hstack()
		.add(spacer(PAD))
		.add(avt::header(self.prompt, hint).fill(1))
		.add(spacer(PAD));

	milktea::Node* canvas = milktea::vstack().fill(1);
	sz per_row = self.n == 4 ? 2 : self.n;
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
	milktea::Node* foot = milktea::hstack().height(xray::pixels(FOOTER_H))
		.with_align(xray::AlignItems.ALIGN_CENTER)
		.add(spacer(PAD))
		.add(dots)
		.add(milktea::vstack().fill(1))
		.add(avt::button("Undo", &undo_clicked))
		.add(spacer(8))
		.add(avt::button("Clear", &clear_clicked))
		.add(spacer(8))
		.add(avt::button("Done", &done_clicked, primary: true))
		.add(spacer(PAD));

	return milktea::vstack()
		.decorate(avt::background())
		.add(top)
		.add(canvas)
		.add(foot);
}

// load reads an image and makes its work copy, shrunk to WORK_MAX across.
fn Panel load(String path) {
	Panel p = { .path = path };
	xray::Image* full = avt::load_image(path) ?? avt::placeholder();
	p.width = full.width;
	p.height = full.height;
	sz big = full.width > full.height ? full.width : full.height;
	if (big > WORK_MAX) {
		sz w = math::max((sz)1, full.width * WORK_MAX / big);
		sz h = math::max((sz)1, full.height * WORK_MAX / big);
		char[] px = mem::new_array(char, w * h * 4);
		full.fit_into(px, w, h, STRETCH);
		p.img = xray::new_image(px, w, h);
		mem::free(px);
		full.destroy();
	} else {
		p.img = full;
	}
	p.base = mem::new_array(char, p.img.rgba.len);
	p.base[..] = p.img.rgba[..];
	return p;
}

fn void usage() {
	io::eprintn(`usage: mcpane pointer [options] IMAGE [--label S] [--desc S]...
Shows one to four images (layouts 1, 1-2, 1-2-3, 2x2) to draw on with the
pointer. Enter or Done writes each marked-up image to a PNG in $TMPDIR and
prints a summary as JSON, in each image's own pixels:
  {"images":[{"path","width","height","marked":"/tmp/pointer-....png"}],
   "strokes":[{"image":0,"color":"red","kind":"loop","bbox":[x,y,w,h]}]}
kind is "click" (with "at"), "line" or "curve" (with "from", "to") or "loop".
Esc exits 1 with no output.

options:
  --prompt S    heading shown above the images
  --color NAME  starting colour: black, white, red (default), yellow, cyan
  --title S     window title (default "Draw")
  --points      also print every stroke's points
  --label S     caption title for the image before it
  --desc S      caption text for the image before it`);
}

// run is `mcpane pointer`: args[0] is the subcommand, options follow.
fn int run(String[] args) {
	Model m = { .color = 2 };
	// Heap-backed: an uninitialised List takes the temp allocator, which
	// milktea resets between frames.
	m.strokes.init(mem);
	g_model = &m;
	String title = "Draw";
	List{String} paths;
	paths.init(mem);
	String[MAX_IMAGES] titles;
	String[MAX_IMAGES] descs;
	for (sz i = 1; i < args.len; i++) {
		String a = args[i];
		sz left = args.len - i - 1;
		switch {
			case a == "--prompt" && left >= 1:
				m.prompt = args[++i];
			case a == "--title" && left >= 1:
				title = args[++i];
			case a == "--points":
				m.points = true;
			case a == "--color" && left >= 1:
				String name = args[++i];
				sz found = -1;
				foreach (j, s : SWATCHES) if (s.name == name) found = j;
				if (found < 0) {
					usage();
					return 2;
				}
				m.color = found;
			case (a == "--label" || a == "--desc") && left >= 1 && paths.len() > 0:
				String v = args[++i];
				if (a == "--label") { titles[paths.len() - 1] = v; } else { descs[paths.len() - 1] = v; }
			case a.starts_with("--"):
				usage();
				return 2;
			default:
				if (paths.len() == MAX_IMAGES) {
					usage();
					return 2;
				}
				paths.push(a);
		}
	}
	if (paths.len() == 0 || paths.len() > MAX_IMAGES) {
		usage();
		return 2;
	}
	foreach (i, p : paths) {
		m.panels[m.n] = load(p);
		m.panels[m.n].title = titles[i];
		m.panels[m.n].desc = descs[i];
		m.n++;
	}
	int cols = m.n == 3 ? 150 : 110;
	int rows = m.n == 4 ? 50 : m.n == 3 ? 34 : 42;
	avt::run((milktea::Model)&m, title, cols, rows);
	return 1;
}
