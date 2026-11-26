// The `draw` tool, served by `mcpane --mcp`.
module pointer;

import avt;
import std::core::string;
import std::collections::object;
import std::collections::list;
import std::encoding::json;

const String TOOL = `{
  "name": "draw",
  "title": "Draw on images",
  "description": "Show the user one to four images in a desktop window and let them draw on them with the pointer (circle, underline, point at, sketch), then return each marked-up image (attached, and saved as a PNG) plus a summary of every stroke in the image's own pixel coordinates: its colour, its kind (click, line, curve or loop) and its bounding box. Use it when the user needs to show you where something is, or mark up a screenshot, photo or design. Layouts: 1 image full size, 2 or 3 side by side, 4 as a 2x2 grid. Colours: black, white, red, yellow, cyan. Blocks until the user presses Done (or Enter) or cancels (Esc). Images are local files in any format macOS can decode (PNG, JPEG, HEIC, WebP...). Only use it in an interactive conversation where the user is present and waiting.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "images": {
        "type": "array", "minItems": 1, "maxItems": 4,
        "items": {
          "oneOf": [
            { "type": "string", "description": "Absolute path to an image file." },
            { "type": "object", "properties": { "path": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" } }, "required": ["path"] }
          ]
        },
        "description": "The images, in order (left to right, then top to bottom): a path, or an object with a path and an optional caption title and description shown under the image."
      },
      "prompt": { "type": "string", "description": "What to draw, shown above the images." },
      "color": { "type": "string", "enum": ["black", "white", "red", "yellow", "cyan"], "description": "Starting colour (default red)." },
      "title": { "type": "string", "description": "Window title." },
      "points": { "type": "boolean", "description": "Also return every stroke's full point list (default false; the summary and marked-up images are usually enough)." }
    },
    "required": ["images"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "cancelled": { "type": "boolean" },
      "images": {
        "type": "array",
        "items": { "type": "object", "properties": { "path": { "type": "string" }, "width": { "type": "integer" }, "height": { "type": "integer" }, "marked": { "type": "string", "description": "PNG of the image with the strokes drawn on, when it has any." } } }
      },
      "strokes": {
        "type": "array",
        "description": "In drawing order. Coordinates are in the image's own pixels, origin top left.",
        "items": {
          "type": "object",
          "properties": {
            "image": { "type": "integer", "description": "0-based index into images." },
            "color": { "type": "string" },
            "kind": { "type": "string", "enum": ["click", "line", "curve", "loop"], "description": "loop: closed or nearly, circling something; line: straight; curve: open and bent." },
            "at": { "type": "array", "items": { "type": "integer" }, "description": "For a click: [x, y]." },
            "from": { "type": "array", "items": { "type": "integer" }, "description": "For a line or curve: start [x, y]." },
            "to": { "type": "array", "items": { "type": "integer" }, "description": "For a line or curve: end [x, y]." },
            "bbox": { "type": "array", "items": { "type": "integer" }, "description": "[x, y, width, height]." },
            "points": { "type": "array", "items": { "type": "array", "items": { "type": "integer" } }, "description": "Only with points: true." }
          }
        }
      }
    }
  }
}`;

// image_args checks a call's images and adds them to argv, each path
// followed by its caption options. Returns an error message, or "".
fn String image_args(Object* a, List{String}* argv) {
	if (!a.has_key("images")) return "images is required";
	Object* images = a.get("images")!!;
	if (!images.is_array() || images.get_len() == 0 || images.get_len() > MAX_IMAGES) {
		return "images must be an array of 1 to 4 paths";
	}
	for (sz i = 0; i < images.get_len(); i++) {
		Object* it = images.get_at(i);
		String path;
		String label;
		String desc;
		if (it.is_string()) {
			path = it.s;
		} else if (it.is_map()) {
			path = avt::opt_string(it, "path");
			label = avt::opt_string(it, "title");
			desc = avt::opt_string(it, "description");
		}
		if (!path.len) return string::tformat("images[%d] must be a path or {path, title, description}", i);
		if (path.starts_with("-")) return string::tformat("images[%d] must be an absolute path", i);
		argv.push(path);
		if (label.len) { argv.push("--label"); argv.push(label); }
		if (desc.len) { argv.push("--desc"); argv.push(desc); }
	}
	return "";
}

// common_args adds the window options.
fn void common_args(Object* a, List{String}* argv) {
	String prompt = avt::opt_string(a, "prompt");
	if (prompt.len) { argv.push("--prompt"); argv.push(prompt); }
	String title = avt::opt_string(a, "title");
	if (title.len) { argv.push("--title"); argv.push(title); }
}

fn String call_draw(String self_path, Object* a) {
	List{String} argv;
	argv.tinit();
	argv.push(self_path);
	argv.push("pointer");
	common_args(a, &argv);
	String color = avt::opt_string(a, "color");
	if (color.len) { argv.push("--color"); argv.push(color); }
	if (a.has_key("points") && (a.get_bool("points") ?? false)) argv.push("--points");
	String err = image_args(a, &argv);
	if (err.len) return avt::error_result(err);

	avt::Run? run = avt::run_self(argv.array_view());
	if (catch e = run) return avt::error_result(string::tformat("could not start pointer: %s", e));
	if (run.code == 1 && run.out.len == 0) return avt::tool_result(`{"cancelled":true}`);
	if (run.code != 0 || run.out.len == 0) {
		return avt::error_result(string::tformat("pointer failed (exit %d): %s", run.code, run.err));
	}
	// Attach the marked-up images so they are seen, not just described.
	List{String} pngs;
	pngs.tinit();
	if (try res = json::tparse(run.out)) {
		if (try imgs = res.get("images")) {
			for (sz i = 0; i < imgs.get_len(); i++) {
				String m = avt::opt_string(imgs.get_at(i), "marked");
				if (m.len) pngs.push(m);
			}
		}
	}
	return avt::tool_result_images(run.out, pngs.array_view());
}

fn avt::Tool draw_tool() => { "draw", TOOL, &call_draw };
