// The `supertools pointer` command line: parses the options, builds the model
// and opens the window.
module pointer;

import supertools;
import milktea;
import milktea_gui;
import std::io;
import std::collections::list;

fn void usage() {
	io::eprintn(
		`usage: supertools pointer [options] IMAGE [--label S] [--desc S]...
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
  --desc S      caption text for the image before it`
	);
}

// run is `supertools pointer`: args[0] is the subcommand, options follow.
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
		sz left  = args.len - i - 1;
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
				if (a == "--label") {
					titles[paths.len() - 1] = v;
				} else {
					descs[paths.len() - 1] = v;
				}
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
	milktea_gui::run((milktea::Model)&m, supertools::window(title, cols, rows));
	return 1;
}
