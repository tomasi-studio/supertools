// The `draw` tool, served by `mcpane --mcp`.
module avt::mcp;

import pointer;
import std::core::string;
import std::collections::object;
import std::collections::list;
import std::encoding::json;

const String DRAW_SCHEMA = $embed("draw.json");

fn String call_draw(String self_path, Object* a) {
	List{String} argv;
	argv.tinit();
	argv.push(self_path);
	argv.push("pointer");
	common_args(a, &argv);
	String color = opt_string(a, "color");
	if (color.len) {
		argv.push("--color");
		argv.push(color);
	}
	if (a.has_key("points") && (a.get_bool("points") ?? false)) argv.push("--points");
	String err = image_args(a, &argv);
	if (err.len) return error_result(err);

	Run? run = run_self(argv.array_view());
	if (catch e = run) return error_result(string::tformat("could not start pointer: %s", e));
	if (run.code == 1 && run.out.len == 0) return tool_result(`{"cancelled":true}`);
	if (run.code != 0 || run.out.len == 0) {
		return error_result(string::tformat("pointer failed (exit %d): %s", run.code, run.err));
	}
	// Attach the marked-up images so they are seen, not just described.
	List{String} pngs;
	pngs.tinit();
	if (try res = json::tparse(run.out)) {
		if (try imgs = res.get("images")) {
			for (sz i = 0; i < imgs.get_len(); i++) {
				String m = opt_string(imgs.get_at(i), "marked");
				if (m.len) pngs.push(m);
			}
		}
	}
	return tool_result_images(run.out, pngs.array_view());
}

fn Tool draw_tool() => { "draw", DRAW_SCHEMA, &call_draw };
