// The `pick` tool, served by `mcpane --mcp`.
module avt::mcp;

import avt;
import picker;
import std::core::dstring;
import std::core::string;
import std::collections::object;
import std::collections::list;

const String PICK_SCHEMA = $embed("pick.json");

// call_pick turns the tool's arguments into a picker command line, runs it,
// and reads back the choice.
fn String call_pick(String self_path, Object* a) {
	if (!a.has_key("items")) return error_result("items is required");
	Object* items = a.get("items")!!;
	if (!items.is_array() || items.get_len() == 0) return error_result("items must be a non-empty array");

	List{String} argv;
	argv.tinit();
	argv.push(self_path);
	argv.push("picker");
	String prompt = opt_string(a, "prompt");
	if (prompt.len) {
		argv.push("--prompt");
		argv.push(prompt);
	}
	String none = opt_string(a, "none");
	if (none.len) {
		argv.push("--none");
		argv.push(none);
	}
	String title = opt_string(a, "title");
	if (title.len) {
		argv.push("--title");
		argv.push(title);
	}
	if (a.has_key("columns")) {
		argv.push("--cols");
		argv.push(string::tformat("%d", a.get_int("columns") ?? 3));
	}
	for (sz i = 0; i < items.get_len(); i++) {
		Object* it = items.get_at(i);
		if (!it.is_map()) return error_result(string::tformat("items[%d] must be an object", i));
		String image = opt_string(it, "image");
		String t     = opt_string(it, "title");
		String desc  = opt_string(it, "description");
		if (image.len && !t.len && !desc.len) {
			argv.push("--image");
			argv.push(image);
		} else if (!image.len && !desc.len && t.len) {
			argv.push("--text");
			argv.push(t);
		} else if (t.len || image.len) {
			argv.push("--card");
			argv.push(image);
			argv.push(t);
			argv.push(desc);
		} else {
			return error_result(string::tformat("items[%d] needs an image or a title", i));
		}
	}

	Run? run = run_self(argv.array_view());
	if (catch err = run) return error_result(string::tformat("could not start picker: %s", err));
	CInt code  = run.code;
	String out = run.out;

	if (code == 1 && out.len == 0) return tool_result(`{"choice":"cancelled"}`);
	if (code != 0 || out.len == 0) {
		return error_result(string::tformat("picker failed (exit %d): %s", code, run.err));
	}
	// "<index>\t<label>"
	sz? tab = out.index_of_char('\t');
	if (catch tab) return error_result(string::tformat("unexpected picker output: %s", out));
	long index   = out[:tab].to_long() ?? -2;
	String label = out[tab + 1..];
	DString s    = dstring::temp();
	if (index < 0) {
		s.append(`{"choice":"none","label":`);
	} else {
		s.appendf(`{"choice":"option","index":%d,"label":`, index);
	}
	avt::json_str(&s, label);
	s.append('}');
	return tool_result(s.str_view());
}

fn Tool pick_tool() => { "pick", PICK_SCHEMA, &call_pick };
