// The `supertools view` command line: parses the options, builds the model
// and opens the window.
module view;

import supertools;
import milktea;
import milktea_gui;
import std::io;

fn void usage() {
	io::eprintn(
		`usage: supertools view [options] IMAGE [--label S] [--desc S]...
Shows one to four images (layouts 1, 1-2, 1-2-3, 2x2) until Esc, Enter or
Space closes the window. Prints nothing.

options:
  --prompt S    heading shown above the images
  --title S     window title (default "View")
  --label S     caption title for the image before it
  --desc S      caption text for the image before it`
	);
}

// run is `supertools view`: args[0] is the subcommand, options follow.
fn int run(String[] args) {
	Model m;
	String title = "View";
	for (sz i = 1; i < args.len; i++) {
		String a = args[i];
		sz left  = args.len - i - 1;
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
				m.panels[m.n++].load(a);
		}
	}
	if (m.n == 0) {
		usage();
		return 2;
	}
	int cols = m.n == 3 ? 150 : 110;
	int rows = m.n == 4 ? 50 : m.n == 3 ? 34 : 42;
	milktea_gui::run((milktea::Model)&m, supertools::window(title, cols, rows));
	return 0;
}
