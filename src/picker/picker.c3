// picker: a blocking chooser for agents. Shows a grid of options (text,
// images, or cards of image + title + description) in a window and prints
// the user's choice to stdout as "<index>\t<label>". Esc cancels: nothing is
// printed and the exit code is 1.
module picker;

import milktea;
import xray;
import glaze;
import std::io;
import std::core::string;
import std::collections::list;
import libc;
import avt;

enum Kind { TEXT, IMAGE, CARD }

struct Item {
	Kind kind;
	String image;
	String title;
	String desc;
	xray::Image* img; // decoded once, on first show
}

const sz PAD_X = 3;      // window side margin, cells
const sz GAP_X = 2;      // between tiles, cells
const sz GAP_Y = 1;      // between grid rows, cells
const sz CARD_PAD_X = 2; // inside a tile, cells
const sz CARD_PAD_Y = 1;

struct Model {
	List{Item} items;
	String prompt;
	String none; // label of the "none of these" button, if any
	sz per_row;
	sz cols;
	sz rows;
	sz sel;
	sz scroll; // grid rows scrolled off the top
	bool follow; // scroll until the selected tile is in view
}

Model* g_model;

fn sz Model.header_h(&self) => self.prompt.len > 0 ? 5 : 4;

// first_rows is a guess at the window's opening height, in cells: there is
// no window to solve the layout in yet. Past it, layout sizes everything,
// and a grid that does not fit scrolls.
fn sz Model.first_rows(&self) {
	sz tile_w = (self.cols - 2 * PAD_X) / self.per_row - GAP_X - 2 * CARD_PAD_X;
	sz h = self.header_h();
	for (sz r = 0; r < self.grid_rows(); r++) {
		sz row = 1;
		for (sz i = r * self.per_row; i < (r + 1) * self.per_row && i < (sz)self.items.len(); i++) {
			Item* it = &self.items[i];
			sz ih = glaze::wrapped_line_count(it.title, tile_w) + glaze::wrapped_line_count(it.desc, tile_w);
			if (it.image.len) ih += tile_w / 2 + 1;
			if (ih > row) row = ih;
		}
		h += row + 2 * CARD_PAD_Y + GAP_Y;
	}
	return h > 44 ? 44 : h;
}

fn sz Model.grid_rows(&self) => (self.items.len() + self.per_row - 1) / self.per_row;

// keep_visible scrolls the selected tile into view after a key moved it,
// one grid row a frame, going by where layout put the tile and the window
// (both click targets) on the last frame.
fn void Model.keep_visible(&self) {
	if (!self.follow) return;
	sz target = self.sel / self.per_row;
	if (target <= self.scroll) {
		self.scroll = target;
		self.follow = false;
		return;
	}
	xray::Rect tile;
	xray::Rect win;
	foreach (t : milktea::g_program.click_targets.array_view()) {
		if (t.id_ptr == &self.items[self.sel]) tile = t.rect;
		if (t.id_ptr == &self.scroll) win = t.rect;
	}
	// Layout squeezes what runs past the window into it, so a tile cut off
	// at the bottom ends exactly at the window's edge, or has no room at all.
	if (win.h && (!tile.h || tile.y + tile.h >= win.y + win.h)) {
		self.scroll++;
		milktea::request_redraw();
	} else {
		self.follow = false;
	}
}

fn void Model.scroll_by(&self, sz d) {
	self.scroll += d;
	if (self.scroll > self.grid_rows() - 1) self.scroll = self.grid_rows() - 1;
	if (self.scroll < 0) self.scroll = 0;
}

// picture decodes the item's image the first time it is shown. A file that
// will not decode shows as a flat placeholder.
fn xray::Image* Model.picture(&self, Item* it) {
	if (!it.img) it.img = avt::load_image(it.image) ?? avt::placeholder();
	return it.img;
}

fn void Model.choose(&self, sz i) {
	Item* it = &self.items[i];
	String label = it.kind == IMAGE ? it.image : it.title;
	io::printfn("%d\t%s", i, label);
	(void)io::stdout().flush();
	libc::exit(0);
}

fn void none_clicked(void* id, String id_str, sz col, sz row) {
	io::printfn("-1\t%s", g_model.none);
	(void)io::stdout().flush();
	libc::exit(0);
}

fn void tile_clicked(void* id, String id_str, sz col, sz row) {
	g_model.choose((Item*)id - g_model.items.entries);
}

// thumb is an item's image as a square-ish rounded picture across the tile.
fn milktea::Node* Model.thumb(&self, Item* it) {
	return xray::image(self.picture(it))
		.decorate(xray::solid(avt::rgb(0x000000)).round(8));
}

fn milktea::Node* Model.tile(&self, sz i) {
	Item* it = &self.items[i];
	bool selected = i == self.sel;
	glaze::Style title_s = glaze::style().foreground(avt::rgb(avt::INK)).with_bold(true);
	glaze::Style desc_s = glaze::style().foreground(avt::rgb(avt::MUTED));

	milktea::Node* body = milktea::vstack();
	switch (it.kind) {
		case TEXT:
			body.add(milktea::text(it.title, title_s));
		case IMAGE:
			body.add(self.thumb(it));
		case CARD:
			if (it.image.len > 0) {
				body.add(self.thumb(it));
			}
			milktea::Node* caption = milktea::vstack()
				.with_padding(it.image.len > 0 ? 1 : 0, 0, 0, 0)
				.add(milktea::text(it.title, title_s));
			if (it.desc.len > 0) caption.add(milktea::text(it.desc, desc_s));
			body.add(caption);
	}

	xray::Decoration d = xray::solid().round(12);
	if (selected) {
		d = d.with_border(2, avt::rgb(avt::ACCENT)).with_shadow(0, 0, 18, avt::rgba(avt::ACCENT, 90), 1);
	} else {
		d = d.with_border(1, avt::rgb(avt::EDGE)).with_shadow(0, 6, 16, avt::rgba(0x000000, 140));
	}
	return body
		.with_padding(CARD_PAD_Y, CARD_PAD_X, CARD_PAD_Y, CARD_PAD_X)
		.style(glaze::style().background(avt::rgb(avt::CARD)), hover: glaze::style().background(avt::rgb(avt::CARD_HOVER)))
		.decorate(d)
		.fill(1)
		.ref(it)
		.pointer(xray::PointerShape.HAND)
		.on_click(&tile_clicked);
}

fn milktea::Cmd Model.init(&self) @dynamic => null;

fn milktea::Cmd Model.update(&self, milktea::Msg msg) @dynamic {
	sz n = self.items.len();
	switch (msg.kind) {
		case WINDOW_SIZE:
			self.cols = msg.window_size.width;
			self.rows = msg.window_size.height;
		case KEY:
			switch (msg.key.code) {
				case ESC:
				case CTRL_C: libc::exit(1);
				case ENTER: self.choose(self.sel);
				case LEFT: if (self.sel > 0) self.sel--;
				case RIGHT: if (self.sel < n - 1) self.sel++;
				case UP: if (self.sel >= self.per_row) self.sel -= self.per_row;
				case DOWN: if (self.sel + self.per_row < n) self.sel += self.per_row;
				case RUNE: if (msg.key.rune == 'q') libc::exit(1);
				default:
			}
			self.follow = true;
		case MOUSE:
			if (msg.mouse.button == MOUSE_WHEEL_UP) self.scroll_by(-1);
			if (msg.mouse.button == MOUSE_WHEEL_DOWN) self.scroll_by(1);
		default:
	}
	return null;
}

fn milktea::Node* Model.view(&self) @dynamic {
	milktea::Node* top = avt::header(self.prompt, "Click to choose  ·  arrows + enter  ·  esc to cancel",
		self.none.len > 0 ? avt::button(self.none, &none_clicked) : null);

	self.keep_visible();
	milktea::Node* grid = milktea::vstack().with_gap(GAP_Y);
	for (sz r = self.scroll; r < self.grid_rows(); r++) {
		milktea::Node* row = milktea::hstack().with_gap(GAP_X);
		for (sz c = 0; c < self.per_row; c++) {
			sz i = r * self.per_row + c;
			row.add(i < (sz)self.items.len() ? self.tile(i) : milktea::vstack().fill(1));
		}
		grid.add(row);
	}

	return milktea::vstack()
		.with_padding(0, PAD_X, 0, PAD_X)
		.decorate(avt::background())
		.ref(&self.scroll).pointer(xray::PointerShape.ARROW) // a target: keep_visible reads its rect
		.add(top)
		.add(grid);
}

fn void usage() {
	io::eprintn(`usage: mcpane picker [options] ITEM...
Shows the items in a grid; prints "<index>\t<label>" for the one clicked
(or picked with arrows + Enter). Esc exits 1 with no output.

items:
  --text LABEL                  a text option
  --image PATH                  an image option (label = PATH)
  --card IMAGE TITLE DESC       a card; IMAGE may be "" (label = TITLE)
options:
  --cols N      tiles per row (default 3); fewer = bigger tiles
  --prompt S    heading shown above the grid
  --none LABEL  a "none of these" button; clicking it prints "-1\tLABEL"
  --title S     window title (default "Pick one")
  --width N     window width in cells (default 100)`);
}

// run is `mcpane picker`: args[0] is the subcommand, options follow.
fn int run(String[] args) {
	Model m = { .per_row = 3, .cols = 100 };
	m.items.init(mem); // an uninitialised List would take the temp allocator
	g_model = &m;
	String title = "Pick one";
	for (sz i = 1; i < args.len; i++) {
		String a = args[i];
		sz left = args.len - i - 1;
		switch {
			case a == "--text" && left >= 1:
				m.items.push({ .kind = TEXT, .title = args[++i] });
			case a == "--image" && left >= 1:
				m.items.push({ .kind = IMAGE, .image = args[++i] });
			case a == "--card" && left >= 3:
				m.items.push({ .kind = CARD, .image = args[i + 1], .title = args[i + 2], .desc = args[i + 3] });
				i += 3;
			case a == "--cols" && left >= 1:
				m.per_row = args[++i].to_int() ?? 3;
			case a == "--width" && left >= 1:
				m.cols = args[++i].to_int() ?? 100;
			case a == "--none" && left >= 1:
				m.none = args[++i];
			case a == "--prompt" && left >= 1:
				m.prompt = args[++i];
			case a == "--title" && left >= 1:
				title = args[++i];
			default:
				usage();
				return 2;
		}
	}
	if (m.items.len() == 0) {
		usage();
		return 2;
	}
	if (m.per_row < 1) m.per_row = 1;
	if (m.cols < 30) m.cols = 30;
	m.rows = m.first_rows();
	avt::run((milktea::Model)&m, title, (int)m.cols, (int)m.rows);
	return 1;
}
