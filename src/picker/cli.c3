// The `supertools picker` command line: parses the options, builds the model
// and opens the window.
module picker;

import supertools;
import milktea;
import milktea_gui;
import std::io;

fn void usage() {
	io::eprintn(
		`usage: supertools picker [options] ITEM...
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
  --width N     window width in cells (default 100)`
	);
}

// run is `supertools picker`: args[0] is the subcommand, options follow.
fn int run(String[] args) {
	Model m = { .per_row = 3, .cols = 100 };
	m.items.init(mem); // an uninitialised List would take the temp allocator
	g_model = &m;
	String title = "Pick one";
	for (sz i = 1; i < args.len; i++) {
		String a = args[i];
		sz left  = args.len - i - 1;
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
	milktea_gui::run((milktea::Model)&m, supertools::window(title, (int)m.cols, (int)m.rows));
	return 1;
}
