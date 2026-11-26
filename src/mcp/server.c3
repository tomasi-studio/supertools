// An MCP server on stdio (newline-delimited JSON-RPC 2.0) serving a set of
// tools. Claude Code starts it once per session; a tool call usually runs a
// fresh process of the same binary for the window, since a window can only
// run once per process, and turns its output into the tool result.
module supertools::mcp;

import supertools;
import std::io;
import std::core::dstring;
import std::core::string;
import std::encoding::json;
import std::collections::object;
import std::collections::list;
import std::os::process;
import libc;
import std::io::file;
import std::encoding::base64;

const String PROTOCOL_VERSION = "2025-06-18";

// ToolFn answers a call with the tool's arguments (a JSON object); it returns
// a result built with tool_result or error_result.
alias ToolFn = fn String(String self_path, Object* args);

struct Tool {
	String name; // the tool's name
	String schema; // the tool's JSON definition
	ToolFn call;
}

// json_id appends a request's id the way it came: a number or a string.
fn void json_id(DString* out, Object* id) @local {
	if (id.is_string()) {
		supertools::json_str(out, id.s);
	} else if (id.is_int()) {
		out.appendf("%d", id.i);
	} else {
		out.appendf("%d", (long)id.f);
	}
}

fn void send(String line) @local {
	io::printn(line);
	(void)io::stdout().flush();
}

fn void reply(Object* id, String result) @local {
	DString out = dstring::temp();
	out.append(`{"jsonrpc":"2.0","id":`);
	json_id(&out, id);
	out.append(`,"result":`);
	out.append(result);
	out.append('}');
	send(out.str_view());
}

fn void reply_error(Object* id, int code, String message) @local {
	DString out = dstring::temp();
	out.append(`{"jsonrpc":"2.0","id":`);
	json_id(&out, id);
	out.appendf(`,"error":{"code":%d,"message":`, code);
	supertools::json_str(&out, message);
	out.append("}}");
	send(out.str_view());
}

// tool_result wraps structured output (a JSON object) as a call result, with
// the same JSON as text for clients that read only content.
fn String tool_result(String structured, bool is_error = false) {
	DString out = dstring::temp();
	out.append(`{"content":[{"type":"text","text":`);
	supertools::json_str(&out, structured);
	out.append("}]");
	if (!is_error) out.appendf(`,"structuredContent":%s`, structured);
	if (is_error) out.append(`,"isError":true`);
	out.append('}');
	return out.str_view();
}

// tool_result_images is tool_result with PNG files attached as image content,
// so the model sees them along with the structured output.
fn String tool_result_images(String structured, String[] pngs) {
	DString out = dstring::temp();
	out.append(`{"content":[{"type":"text","text":`);
	supertools::json_str(&out, structured);
	out.append('}');
	foreach (path : pngs) {
		char[]? data = file::load_temp(path);
		if (catch data) continue;
		out.append(`,{"type":"image","mimeType":"image/png","data":"`);
		out.append(base64::tencode(data));
		out.append(`"}`);
	}
	out.appendf(`],"structuredContent":%s}`, structured);
	return out.str_view();
}

fn String error_result(String message) {
	DString s = dstring::temp();
	s.append(`{"error":`);
	supertools::json_str(&s, message);
	s.append('}');
	return tool_result(s.str_view(), true);
}

fn String opt_string(Object* o, String key) => o.has_key(key) ? (o.get_string(key) ?? "") : "";

// Run is a finished child process: its exit code and output.
struct Run {
	CInt code;
	String out;
	String err;
}

// run_self runs argv (the tool's own binary first) and collects its output.
fn Run? run_self(String[] argv) {
	Process p = process::spawn(argv, SpawnOptions.INHERIT_ENV)!;
	defer p.destroy();
	// Drain stdout before joining: a child blocks once the pipe fills.
	DString out = dstring::temp();
	char[4096] buf;
	while (try n = p.read_stdout(&buf, buf.len)) {
		if (n == 0) break;
		out.append((String)buf[:n]);
	}
	CInt code = p.join() ?? -1;
	sz en     = p.read_stderr(&buf, buf.len) ?? 0;
	return { code, out.str_view().trim(), ((String)buf[:en]).tcopy().trim() };
}

// Windows started with start_self, which nobody waits on. Heap-backed: an
// uninitialised List takes the temp allocator, and requests run in @pool.
List{Process} g_started @local;

// start_self runs argv (the tool's own binary first) in the background, with
// nothing connected to its input or output: stdout is the MCP channel.
fn void? start_self(String[] argv) {
	CFile null_file = libc::fopen("/dev/null", "r+");
	if (!null_file) return io::FILE_NOT_FOUND~;
	defer libc::fclose(null_file);
	ProcessStdio dev_null = process::bind((CInt)libc::fileno(null_file));
	Process p             = process::spawn(argv, SpawnOptions.INHERIT_ENV, { }, dev_null, dev_null, dev_null)!;
	if (!g_started.is_initialized()) g_started.init(mem);
	g_started.push(p);
}

// reap collects background windows that have closed.
fn void reap() @local {
	for (sz i = g_started.len(); i > 0; i--) {
		if (!(g_started[i - 1].is_running() ?? false)) {
			g_started[i - 1].destroy();
			g_started.remove_at(i - 1);
		}
	}
}

fn void handle(String server, Tool[] tools, String self_path, String line) @local {
	Object*? msg = json::tparse(line);
	if (catch msg) {
		send(`{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"parse error"}}`);
		return;
	}
	String method = msg.get_string("method") ?? "";
	// Notifications (no id) need no answer.
	if (!msg.has_key("id")) return;
	Object* id = msg.get("id")!!;

	switch (method) {
		case "initialize":
			String version = PROTOCOL_VERSION;
			if (try params = msg.get("params")) version = params.get_string("protocolVersion") ?? version;
			DString r = dstring::temp();
			r.append(`{"protocolVersion":`);
			supertools::json_str(&r, version);
			r.append(`,"capabilities":{"tools":{}},"serverInfo":{"name":`);
			supertools::json_str(&r, server);
			r.append(`,"version":"1.0.0"}}`);
			reply(id, r.str_view());
		case "ping":
			reply(id, "{}");
		case "tools/list":
			// One message per line: schemas are written over many.
			DString t = dstring::temp();
			t.append(`{"tools":[`);
			foreach (i, &tool : tools) {
				if (i) t.append(',');
				foreach (c : tool.schema) if (c != '\n') t.append(c);
			}
			t.append("]}");
			reply(id, t.str_view());
		case "tools/call":
			Object* params = msg.get("params") ?? null;
			String name = params ? params.get_string("name") ?? "" : "";
			Tool* tool = null;
			foreach (&t : tools) if (t.name == name) tool = t;
			if (!tool) {
				reply_error(id, -32602, string::tformat("unknown tool: %s", name));
				return;
			}
			Object* args = params.get("arguments") ?? null;
			if (!args || !args.is_map()) {
				reply(id, error_result("arguments must be an object"));
				return;
			}
			reply(id, tool.call(self_path, args));
		default:
			reply_error(id, -32601, string::tformat("method not found: %s", method));
	}
}

// serve answers MCP requests on stdin until it closes.
fn int serve(String server, Tool[] tools, String self_path) {
	while (true) {
		bool done = false;
		@pool() {
			String? line = io::treadline();
			if (catch line) {
				done = true;
			} else if (line.trim().len > 0) {
				reap();
				handle(server, tools, self_path, line);
			}
		};
		if (done) break;
	}
	return 0;
}
