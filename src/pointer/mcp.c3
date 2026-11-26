// The `draw` tool, served by `mcpane --mcp`.
module pointer;

import avt;
import std::core::string;
import std::collections::object;
import std::collections::list;
import std::encoding::json;

const String TOOL = $embed("draw.json");

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
