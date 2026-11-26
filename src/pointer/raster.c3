// The images under the strokes: loading them at working size and painting
// strokes into their pixels.
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

const sz WORK_MAX = 1600; // longest side images are drawn on at, pixels

// to_work turns a point local to the panel's image node into work image
// pixels, clamped to the image. The node is as layout solved it (a click
// target, since it takes presses); the image sits in it as CONTAIN put it.
fn Point Panel.to_work(&self, float x, float y) {
	foreach (t : milktea::g_program.click_targets.array_view()) {
		if (t.id_ptr != self) continue;
		float ox, oy, dw, dh;
		self.img.placement(CONTAIN, (float)t.rect.w, (float)t.rect.h, &ox, &oy, &dw, &dh);
		if (dw >= 1) self.iw = dw;
		x -= ox;
		y -= oy;
		break;
	}
	float k = (float)self.img.width / math::max(self.iw, 1.0f);
	return {
		math::clamp(x * k, 0.0f, (float)self.img.width - 1),
		math::clamp(y * k, 0.0f, (float)self.img.height - 1)
	};
}

// stamp paints a round-capped line from a to b, radius r, in work pixels.
fn void Panel.stamp(&self, Point a, Point b, float r, uint hex) {
	xray::Image* img = self.img;
	sz x0            = (sz)math::max(0.0f, math::min(a.x, b.x) - r - 1);
	sz y0            = (sz)math::max(0.0f, math::min(a.y, b.y) - r - 1);
	sz x1            = (sz)math::min((float)img.width - 1, math::max(a.x, b.x) + r + 1);
	sz y1            = (sz)math::min((float)img.height - 1, math::max(a.y, b.y) + r + 1);
	float dx         = b.x - a.x;
	float dy         = b.y - a.y;
	float len2       = dx * dx + dy * dy;
	char cr          = (char)(hex >> 16);
	char cg          = (char)(hex >> 8);
	char cb          = (char)hex;
	for (sz y = y0; y <= y1; y++) {
		for (sz x = x0; x <= x1; x++) {
			float px  = (float)x + 0.5f - a.x;
			float py  = (float)y + 0.5f - a.y;
			float t   = len2 > 0 ? math::clamp((px * dx + py * dy) / len2, 0.0f, 1.0f) : 0.0f;
			float ex  = px - t * dx;
			float ey  = py - t * dy;
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

fn float Panel.brush(&self) => BRUSH * (float)self.img.width / math::max(self.iw, 1.0f);

fn void Model.paint_segment(&self, Stroke* s, sz from) {
	Panel* p = &self.panels[s.panel];
	Point a  = s.points[from == 0 ? 0 : from - 1];
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

// load reads an image and makes its work copy, shrunk to WORK_MAX across.
fn Panel load(String path) {
	Panel p           = { .path = path };
	xray::Image* full = supertools::load_image(path) ?? supertools::placeholder();
	p.width = full.width;
	p.height = full.height;
	sz big = full.width > full.height ? full.width : full.height;
	if (big > WORK_MAX) {
		sz w      = math::max((sz)1, full.width * WORK_MAX / big);
		sz h      = math::max((sz)1, full.height * WORK_MAX / big);
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
