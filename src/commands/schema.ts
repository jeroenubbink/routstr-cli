import type { Command } from "commander";
import { printJson } from "../client";

interface SchemaNode {
  name: string;
  description: string;
  options?: Array<{ flags: string; description: string }>;
  commands?: SchemaNode[];
}

function buildSchema(cmd: Command): SchemaNode {
  const node: SchemaNode = {
    name: cmd.name(),
    description: cmd.description(),
  };

  const opts = cmd.options;
  if (opts.length) {
    node.options = opts.map((o) => ({
      flags: o.flags,
      description: o.description,
    }));
  }

  const subs = cmd.commands as Command[];
  if (subs.length) {
    node.commands = subs.map(buildSchema);
  }

  return node;
}

export function schemaCommand(program: Command): void {
  printJson(buildSchema(program));
}
