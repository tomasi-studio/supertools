// The `pick` tool, served by `mcpane --mcp`.
module picker;

import avt;
import std::core::dstring;
import std::core::string;
import std::collections::object;
import std::collections::list;

const String TOOL = `{
  "name": "pick",
  "title": "Visual picker",
  "description": "Show the user a grid of options in a desktop window and wait for them to choose one. Use it when a choice is easier to make by seeing it than reading it: generated images, logos, screenshots, UI or design variants, or short labelled options. Blocks until the user picks, presses the 'none' button, or cancels (Esc). Images are local files in any format macOS can decode (PNG, JPEG, HEIC, WebP, AVIF, GIF, TIFF...); no SVG, PDF or URLs. Only use it in an interactive conversation where the user is present and waiting; never as part of a long-running or autonomous task, where the window would block with nobody to answer.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": { "type": "string", "description": "The question, shown above the options." },
      "items": {
        "type": "array",
        "minItems": 1,
        "description": "The options, in order. An item with only an image is a picture tile; with only a title, a text tile; with both (and an optional description), a card.",
        "items": {
          "type": "object",
          "properties": {
            "image": { "type": "string", "description": "Absolute path to an image file." },
            "title": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      },
      "columns": { "type": "integer", "minimum": 1, "description": "Tiles per row (default 3). Fewer columns make bigger tiles." },
      "none": { "type": "string", "description": "Label for an optional button that rejects every option, e.g. 'None of these'." },
      "title": { "type": "string", "description": "Window title." }
    },
    "required": ["items"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "choice": { "type": "string", "enum": ["option", "none", "cancelled"] },
      "index": { "type": "integer", "description": "0-based index into items, for choice 'option'." },
      "label": { "type": "string", "description": "The chosen item's title (or image path)." }
    },
    "required": ["choice"]
  }
}`;

// call_pick turns the tool's arguments into a picker command line, runs it,
// and reads back the choice.
fn String call_pick(String self_path, Object* a) {
	if (!a.has_key("items")) return avt::error_result("items is required");
	Object* items = a.get("items")!!;
	if (!items.is_array() || items.get_len() == 0) return avt::error_result("items must be a non-empty array");

	List{String} argv;
	argv.tinit();
	argv.push(self_path);
	argv.push("picker");
	String prompt = avt::opt_string(a, "prompt");
	if (prompt.len) { argv.push("--prompt"); argv.push(prompt); }
	String none = avt::opt_string(a, "none");
	if (none.len) { argv.push("--none"); argv.push(none); }
	String title = avt::opt_string(a, "title");
	if (title.len) { argv.push("--title"); argv.push(title); }
	if (a.has_key("columns")) {
		argv.push("--cols");
		argv.push(string::tformat("%d", a.get_int("columns") ?? 3));
	}
	for (sz i = 0; i < items.get_len(); i++) {
		Object* it = items.get_at(i);
		if (!it.is_map()) return avt::error_result(string::tformat("items[%d] must be an object", i));
		String image = avt::opt_string(it, "image");
		String t = avt::opt_string(it, "title");
		String desc = avt::opt_string(it, "description");
		if (image.len && !t.len && !desc.len) {
			argv.push("--image"); argv.push(image);
		} else if (!image.len && !desc.len && t.len) {
			argv.push("--text"); argv.push(t);
		} else if (t.len || image.len) {
			argv.push("--card"); argv.push(image); argv.push(t); argv.push(desc);
		} else {
			return avt::error_result(string::tformat("items[%d] needs an image or a title", i));
		}
	}

	avt::Run? run = avt::run_self(argv.array_view());
	if (catch err = run) return avt::error_result(string::tformat("could not start picker: %s", err));
	CInt code = run.code;
	String out = run.out;

	if (code == 1 && out.len == 0) return avt::tool_result(`{"choice":"cancelled"}`);
	if (code != 0 || out.len == 0) {
		return avt::error_result(string::tformat("picker failed (exit %d): %s", code, run.err));
	}
	// "<index>\t<label>"
	sz? tab = out.index_of_char('\t');
	if (catch tab) return avt::error_result(string::tformat("unexpected picker output: %s", out));
	long index = out[:tab].to_long() ?? -2;
	String label = out[tab + 1..];
	DString s = dstring::temp();
	if (index < 0) {
		s.append(`{"choice":"none","label":`);
	} else {
		s.appendf(`{"choice":"option","index":%d,"label":`, index);
	}
	avt::json_str(&s, label);
	s.append('}');
	return avt::tool_result(s.str_view());
}

fn avt::Tool tool() => { "pick", TOOL, &call_pick };
