// supertools: small desktop windows an agent opens to show the user something
// and, for some, get an answer back. Each subcommand is one window; --mcp
// serves them all as MCP tools on stdio.
module main;

import supertools::mcp;
import picker;
import pointer;
import view;
import std::io;

fn void usage() {
	io::eprintn(
		`usage: supertools COMMAND [options] ...
commands:
  picker   show options in a grid; print the one chosen
  pointer  draw on one to four images; print what was marked
  view     show one to four images
  --mcp    serve them as MCP tools on stdio: pick, draw, view

Run a command with no arguments for its options.`
	);
}

fn int main(String[] args) {
	if (args.len < 2) {
		usage();
		return 2;
	}
	switch (args[1]) {
		case "--mcp":
			mcp::Tool[3] tools = { mcp::pick_tool(), mcp::draw_tool(), mcp::view_tool() };
			return mcp::serve("supertools", &tools, args[0]);
		case "picker": return picker::run(args[1..]);
		case "pointer": return pointer::run(args[1..]);
		case "view": return view::run(args[1..]);
		case "-h":
		case "--help":
		case "help":
			usage();
			return 0;
		default:
			usage();
			return 2;
	}
}
