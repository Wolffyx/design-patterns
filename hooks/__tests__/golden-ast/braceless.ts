// AST-only golden fixture: shapes the regex scanner cannot see.
export function guard(x: any) {
  if (x.a)
    if (x.b) go();
  const re = /\{\{ (\w+) \}/;
  if (x.c) {
    if (x.d) { go(); }
  }
  for (const id of x.ids)
    repo.findById(id);
}
declare function go(): void;
declare const repo: any;
