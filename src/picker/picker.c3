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
}

Model* g_model;

fn sz Model.header_h(&self) => self.prompt.len > 0 ? 5 : 4;

fn sz Model.tile_w(&self) {
	sz w = (self.cols - 2 * PAD_X - GAP_X * (self.per_row - 1)) / self.per_row;
	return w < 6 ? 6 : w;
}
// Content width inside a tile's padding, in cells.
fn sz Model.inner_w(&self) => self.tile_w() - 2 * CARD_PAD_X;
fn sz Model.img_rows(&self) => (self.inner_w() + 1) / 2;

fn sz Model.grid_rows(&self) => (self.items.len() + self.per_row - 1) / self.per_row;

// inner_h estimates how many cell rows an item's content takes. Layout does
// its own sizing; this only sets the window's first height and scrolling.
fn sz Model.inner_h(&self, Item* it) {
	sz w = self.inner_w();
	switch (it.kind) {
		case TEXT: return glaze::wrapped_line_count(it.title, w);
		case IMAGE: return self.img_rows();
		case CARD:
			sz h = glaze::wrapped_line_count(it.title, w);
			if (it.desc.len > 0) h += glaze::wrapped_line_count(it.desc, w);
			if (it.image.len > 0) h += self.img_rows() + 1;
			return h;
	}
}

// row_h estimates grid row r's height in cell rows, padding included.
fn sz Model.row_h(&self, sz r) {
	sz h = 1;
	for (sz i = r * self.per_row; i < (r + 1) * self.per_row && i < (sz)self.items.len(); i++) {
		sz ih = self.inner_h(&self.items[i]);
		if (ih > h) h = ih;
	}
	return h + 2 * CARD_PAD_Y;
}

fn sz Model.content_h(&self) {
	sz h = 0;
	for (sz r = 0; r < self.grid_rows(); r++) h += self.row_h(r) + GAP_Y;
	return h;
}

fn void Model.keep_visible(&self) {
	sz target = self.sel / self.per_row;
	if (target < self.scroll) self.scroll = target;
	sz room = self.rows - self.header_h() - 1;
	while (self.scroll < target) {
		sz h = 0;
		for (sz r = self.scroll; r <= target; r++) h += self.row_h(r) + GAP_Y;
		if (h <= room) break;
		self.scroll++;
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
		.height(milktea::cells(self.img_rows()))
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
			self.keep_visible();
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
	m.rows = m.header_h() + m.content_h();
	if (m.rows > 44) m.rows = 44;
	avt::run((milktea::Model)&m, title, (int)m.cols, (int)m.rows);
	return 1;
}
