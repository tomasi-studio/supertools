// The `view` tool, served by `mcpane --mcp`.
module view;

import avt;
import std::core::string;
import std::collections::object;
import std::collections::list;

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

const String TOOL = `{
  "name": "view",
  "title": "Show images",
  "description": "Show the user one to four images in a desktop window, with optional captions, and return at once: the window stays open until the user closes it (Esc, Enter or Space) and nothing comes back from it. Use it to put something you made or found in front of the user, e.g. a generated image, a screenshot or a before/after pair, when they should look at it but there is nothing to choose or mark. To have them choose, use pick; to have them point at something, use draw. Layouts: 1 image full size, 2 or 3 side by side, 4 as a 2x2 grid. Images are local files (PNG, JPEG, HEIC, WebP...).",
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
      "prompt": { "type": "string", "description": "Heading shown above the images." },
      "title": { "type": "string", "description": "Window title." }
    },
    "required": ["images"]
  }
}`;

// call_view opens the window in the background and returns: nothing is
// asked of the user, so there is nothing to wait for.
fn String call_view(String self_path, Object* a) {
	List{String} argv;
	argv.tinit();
	argv.push(self_path);
	argv.push("view");
	common_args(a, &argv);
	String err = image_args(a, &argv);
	if (err.len) return avt::error_result(err);
	if (catch e = avt::start_self(argv.array_view())) {
		return avt::error_result(string::tformat("could not open the window: %s", e));
	}
	return avt::tool_result(`{"shown":true}`);
}

fn avt::Tool tool() => { "view", TOOL, &call_view };
