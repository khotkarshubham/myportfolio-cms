// Match whole normalized names only: never guess a brand from a substring.
export const normalizeSkillName = (name) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, "");
const aliases = {
  amazonwebservices: "aws",
  amazonaws: "aws",
  microsoftazure: "azure",
  googlecloudplatform: "gcp",
  googlecloud: "gcp",
  k8s: "kubernetes",
  node: "nodejs",
  nodejs: "nodejs",
  reactjs: "react",
  postgresql: "postgresql",
  postgres: "postgresql",
  mongodatabase: "mongodb",
  microsoftazuredevops: "azuredevops",
  shell: "bash",
  bashscripting: "bash",
  shellscript: "bash",
  shellscripting: "bash",
  vmwarevsphere: "vsphere",
  vmwareesxi: "esxi",
  proxmoxve: "proxmox",
  microsoftwindows: "windows",
  hashicorpterraform: "terraform",
  hashicorpvault: "vault",
  redhatlinux: "redhat",
  redhatenterpriselinux: "redhat",
  rhel: "redhat",
  argocd: "argo",
  openshift: "redhatopenshift",
  apachehttpserver: "apache",
  js: "javascript",
  ts: "typescript",
  html5: "html",
  css3: "css",
  cplusplus: "c++",
  csharp: "c#",
};
export function resolveSkillKey(name) {
  const key = normalizeSkillName(name);
  return Object.hasOwn(aliases, key) ? aliases[key] : key;
}
