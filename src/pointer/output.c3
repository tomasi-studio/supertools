// Finishing: writing the marked-up images to PNGs and printing the strokes
// as JSON.
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

// orig turns a work image point into the file's own pixels.
fn long[2] Panel.orig(&self, Point pt) {
	return {
		(long)math::round(pt.x * (float)self.width / (float)self.img.width),
		(long)math::round(pt.y * (float)self.height / (float)self.img.height)
	};
}

// describe appends a stroke's summary: what it looks like (a click, a line
// a curve or a loop), its bounds, and its points if asked for.
fn void Model.describe(&self, DString* out, Stroke* s) {
	Panel* p      = &self.panels[s.panel];
	long[2] first = p.orig(s.points[0]);
	long[2] last  = p.orig(s.points[^1]);
	long x0       = first[0];
	long y0       = first[1];
	long x1       = x0;
	long y1       = y0;
	double len    = 0;
	long[2] prev  = first;
	foreach (pt : s.points) {
		long[2] o = p.orig(pt);
		x0 = math::min(x0, o[0]);
		y0 = math::min(y0, o[1]);
		x1 = math::max(x1, o[0]);
		y1 = math::max(y1, o[1]);
		len += math::sqrt((double)((o[0] - prev[0]) * (o[0] - prev[0]) + (o[1] - prev[1]) * (o[1] - prev[1])));
		prev = o;
	}
	double per_pt = (double)p.width / math::max((double)p.iw, 1.0); // file pixels per screen point
	double extent = (double)math::max(x1 - x0, y1 - y0);
	double gap    = math::sqrt(
		(double)((last[0] - first[0]) * (last[0] - first[0]) + (last[1] - first[1]) * (last[1] - first[1]))
	);
	String kind   = "line";
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
