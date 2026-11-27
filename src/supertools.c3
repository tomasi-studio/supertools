// supertools: what the agent visual tools share: the palette, the window setup,
// image loading, and the MCP server (see mcp/).
module supertools @link(env::DARWIN, "ImageIO.framework", "CoreGraphics.framework", "CoreFoundation.framework");

import milktea;
import milktea_gui;
import xray;
import glaze;
import std::io;
import std::io::file;
import std::core::dstring;
import std::os::env;
import stb_image;

extern fn char* supertools_load_image(ZString path, CInt* w, CInt* h);
extern fn void supertools_free(void* p);
extern fn CInt stbi_write_png(ZString path, CInt w, CInt h, CInt comp, void* data, iptr stride);

const int CELL_W = 10;
const int CELL_H = 19;

// Palette
const uint BG_TOP     = 0x16181f;
const uint BG_BOTTOM  = 0x0c0d11;
const uint CARD       = 0x1c1f27;
const uint CARD_HOVER = 0x242833;
const uint EDGE       = 0x2c313d;
const uint ACCENT     = 0x5ab4ff;
const uint INK        = 0xeceef3;
const uint MUTED      = 0x8b92a3;
const uint FAINT      = 0x5a6070;

fn xray::Color rgb(uint hex) => xray::color_rgb((char)(hex >> 16), (char)(hex >> 8), (char)hex);
fn xray::Color rgba(uint hex, char a) => xray::color_rgba((char)(hex >> 16), (char)(hex >> 8), (char)hex, a);

fn xray::Decoration background() => xray::linear(rgb(BG_TOP), rgb(BG_BOTTOM));

// load_image decodes a file with ImageIO on macOS, and with stb_image for
// what ImageIO lacks (TGA, HDR, PNM, PIC) and on other systems.
fn xray::Image*? load_image(String path) {
	CInt w, h;
	char* px = supertools_load_image(path.zstr_tcopy(), &w, &h);
	if (px) {
		defer supertools_free(px);
		return xray::new_image(px[:(sz)w * h * 4], w, h);
	}
	int sw, sh, n;
	char* spx = stb_image::stbi_load(path.zstr_tcopy(), &sw, &sh, &n, 4);
	if (!spx) return io::FILE_NOT_VALID~;
	defer stb_image::stbi_image_free(spx);
	return xray::new_image(spx[:(sz)sw * sh * 4], sw, sh);
}

// Gif is every frame of an animated GIF, in one buffer of RGBA frames.
struct Gif {
	char[] frames;  // count * width * height * 4 bytes, straight alpha
	int[] delays;   // ms each frame stays up
	sz count;
	sz width;
	sz height;
}

// load_gif decodes every frame of a GIF file. Fails for other files, and
// for a GIF with a single frame, which load_image handles.
fn Gif? load_gif(String path) {
	char[] data = file::load_temp(path)!;
	if (data.len < 6 || (String)data[:3] != "GIF") return io::FILE_NOT_VALID~;
	int w, h, n, comp;
	int* delays;
	char* px = stb_image::stbi_load_gif_from_memory(data.ptr, (int)data.len, &delays, &w, &h, &n, &comp, 4);
	if (!px) return io::FILE_NOT_VALID~;
	defer stb_image::stbi_image_free(px);
	defer stb_image::stbi_image_free(delays);
	if (n < 2) return io::FILE_NOT_VALID~;
	sz total = (sz)n * w * h * 4;
	Gif g = { .count = n, .width = w, .height = h };
	g.frames = mem::new_array(char, total);
	g.frames[..] = px[:total];
	g.delays = mem::new_array(int, n);
	for (sz i = 0; i < n; i++) g.delays[i] = delays[i] < 20 ? 100 : delays[i]; // browsers treat 0-10ms as 100ms
	return g;
}

// json_str appends s as a JSON string literal.
fn void json_str(DString* out, String s) {
	out.append('"');
	foreach (c : s) {
		switch (c) {
			case '"': out.append("\\\"");
			case '\\': out.append("\\\\");
			case '\n': out.append("\\n");
			case '\r': out.append("\\r");
			case '\t': out.append("\\t");
			default:
				if (c < 0x20) {
					out.appendf("\\u%04x", c);
				} else {
					out.append(c);
				}
		}
	}
	out.append('"');
}

// write_png saves an image as a PNG file.
fn bool write_png(String path, xray::Image* img) {
	return stbi_write_png(
		path.zstr_tcopy(),
		(CInt)img.width,
		(CInt)img.height,
		4,
		img.rgba.ptr,
		(iptr)img.width * 4
	) != 0;
}

// placeholder is a flat tile for a file that would not decode.
fn xray::Image* placeholder() {
	char[4] grey = { 0x2a, 0x20, 0x30, 0xff };
	return xray::new_image(&grey, 1, 1);
}

// header is the window's top: an optional prompt, a hint line, and any
// buttons on the right. It doubles as the window's drag handle.
fn milktea::Node* header(String prompt, String hint, milktea::Node* right = null) {
	milktea::Node* text = milktea::vstack().window_drag().with_padding(1, 0, 1, 0);
	if (prompt.len > 0) {
		text.add(milktea::text(prompt, glaze::style().foreground(rgb(INK)).with_bold(true)));
	}
	text.add(milktea::text(hint, glaze::style().foreground(rgb(FAINT))));
	milktea::Node* top = milktea::hstack().with_align(xray::AlignItems.ALIGN_CENTER).add(text.fill(1));
	if (right) top.add(right);
	return top;
}

// button is a small rounded text button.
fn milktea::Node* button(String label, xray::ClickFn on_click, bool primary = false) {
	return milktea::text(label, glaze::style().foreground(rgb(primary ? 0x0c0d11 : INK)).with_bold(primary))
		.style(glaze::style()
			.background(rgb(primary ? ACCENT : CARD)), hover: glaze::style()
				.background(rgb(primary ? 0x7cc4ff : CARD_HOVER)))
		.decorate(xray::solid().round(8).padding(6, 14, 6, 14).with_border(1, rgb(primary ? ACCENT : EDGE)))
		.pointer(xray::PointerShape.HAND)
		.on_click(on_click);
}

// window is the options every tool's window shares: borderless, rounded,
// dragged by its top row, and kept above other windows. Pass it to
// milktea_gui::run. With SUPERTOOLS_SCREENSHOT set, the first frame is written to
// that PNG instead.
fn milktea_gui::GuiOptions window(String title, int cols, int rows) {
	return {
		.screenshot_path = env::tget_var("SUPERTOOLS_SCREENSHOT") ?? "",
		.title = title,
		.cols = cols,
		.rows = rows,
		.cell_w = CELL_W,
		.cell_h = CELL_H,
		.font_size = 17,
		.chrome_rows = 1,
		.hide_window_buttons = true,
		.corner_radius = 12, // The agent is waiting on these: keep them above the terminal.
		.always_on_top = true,
	};
}
