export async function loadProfile(id: string) {
  return fetch(`/profiles/${id}`);
}
export function formatName(first: string, last: string) {
  return `${first} ${last}`;
}
