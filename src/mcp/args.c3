// Helpers the tools share for turning their arguments into a command line.
module supertools::mcp;

import view;
import pointer;
import std::core::string;
import std::collections::object;
import std::collections::list;

// view and draw take the same images argument.
$assert view::MAX_IMAGES == pointer::MAX_IMAGES;

// image_args checks a call's images and adds them to argv, each path
// followed by its caption options. Returns an error message, or "".
fn String image_args(Object* a, List{String}* argv) {
	if (!a.has_key("images")) return "images is required";
	Object* images = a.get("images")!!;
	if (!images.is_array() || images.get_len() == 0 || images.get_len() > view::MAX_IMAGES) {
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
			path = opt_string(it, "path");
			label = opt_string(it, "title");
			desc = opt_string(it, "description");
		}
		if (!path.len) return string::tformat("images[%d] must be a path or {path, title, description}", i);
		if (path.starts_with("-")) return string::tformat("images[%d] must be an absolute path", i);
		argv.push(path);
		if (label.len) {
			argv.push("--label");
			argv.push(label);
		}
		if (desc.len) {
			argv.push("--desc");
			argv.push(desc);
		}
	}
	return "";
}

// common_args adds the window options.
fn void common_args(Object* a, List{String}* argv) {
	String prompt = opt_string(a, "prompt");
	if (prompt.len) {
		argv.push("--prompt");
		argv.push(prompt);
	}
	String title = opt_string(a, "title");
	if (title.len) {
		argv.push("--title");
		argv.push(title);
	}
}
