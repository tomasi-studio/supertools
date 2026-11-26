// The `view` tool, served by `mcpane --mcp`.
module avt::mcp;

import view;
import std::core::string;
import std::collections::object;
import std::collections::list;

const String VIEW_SCHEMA = $embed("view.json");

// call_view opens the window in the background and returns: nothing is
// asked of the user, so there is nothing to wait for.
fn String call_view(String self_path, Object* a) {
	List{String} argv;
	argv.tinit();
	argv.push(self_path);
	argv.push("view");
	common_args(a, &argv);
	String err = image_args(a, &argv);
	if (err.len) return error_result(err);
	if (catch e = start_self(argv.array_view())) {
		return error_result(string::tformat("could not open the window: %s", e));
	}
	return tool_result(`{"shown":true}`);
}

fn Tool view_tool() => { "view", VIEW_SCHEMA, &call_view };
