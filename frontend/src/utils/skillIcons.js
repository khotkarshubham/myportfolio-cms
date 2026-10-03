import { FiCode, FiCloud, FiServer, FiDatabase, FiTool } from "react-icons/fi";
import {
  FaAws,
  FaDocker,
  FaLinux,
  FaPython,
  FaWindows,
  FaMicrosoft,
} from "react-icons/fa";

import {
  SiProxmox,
  SiJavascript,
  SiTypescript,
  SiUbuntu,
  SiDebian,
  SiMysql,
  SiGitlab,
  SiArgo,
  SiRedhat,
  SiRedhatopenshift,
  SiOpenstack,
  SiHtml5,
  SiCss,
  SiCplusplus,
  SiDotnet,
  SiKubernetes,
  SiTerraform,
  SiPrometheus,
  SiGrafana,
  SiJenkins,
  SiAnsible,
  SiGithub,
  SiGithubactions,
  SiGit,
  SiNodedotjs,
  SiReact,
  SiMongodb,
  SiPostgresql,
  SiRedis,
  SiNginx,
  SiApache,
  SiHelm,
  SiVmware,
  SiCisco,
  SiHashicorp,
  SiPacker,
  SiVault,
  SiConsul,
  SiGooglecloud,
  SiDigitalocean,
  SiCloudflare,
  SiRabbitmq,
} from "react-icons/si";

import { VscAzure, VscTerminalLinux } from "react-icons/vsc";

export const skillIcons = {
  "generic-code": FiCode,
  "generic-cloud": FiCloud,
  "generic-server": FiServer,
  "generic-database": FiDatabase,
  "generic-tool": FiTool,
  /* CLOUD */

  aws: FaAws,
  azure: VscAzure,
  gcp: SiGooglecloud,
  googlecloud: SiGooglecloud,
  digitalocean: SiDigitalocean,
  cloudflare: SiCloudflare,

  /* CONTAINERS */

  docker: FaDocker,
  kubernetes: SiKubernetes,
  helm: SiHelm,

  /* INFRASTRUCTURE AS CODE */

  terraform: SiTerraform,
  ansible: SiAnsible,
  packer: SiPacker,
  vault: SiVault,
  consul: SiConsul,
  hashicorp: SiHashicorp,

  /* CI/CD */

  jenkins: SiJenkins,
  githubactions: SiGithubactions,
  azuredevops: FaMicrosoft,

  /* VERSION CONTROL */

  git: SiGit,
  github: SiGithub,

  /* MONITORING */

  prometheus: SiPrometheus,
  grafana: SiGrafana,

  /* WEB SERVERS */

  nginx: SiNginx,
  apache: SiApache,

  /* PROGRAMMING */

  python: FaPython,
  nodejs: SiNodedotjs,
  react: SiReact,

  /* DATABASES */

  mongodb: SiMongodb,
  postgresql: SiPostgresql,
  redis: SiRedis,
  rabbitmq: SiRabbitmq,

  /* OPERATING SYSTEM */

  linux: FaLinux,
  windows: FaWindows,
  bash: VscTerminalLinux,

  /* VIRTUALIZATION */

  vmware: SiVmware,
  vsphere: SiVmware,
  esxi: SiVmware,
  proxmox: SiProxmox,
  hyperv: FaWindows,

  /* NETWORKING */

  javascript: SiJavascript,
  typescript: SiTypescript,
  ubuntu: SiUbuntu,
  debian: SiDebian,
  mysql: SiMysql,
  gitlab: SiGitlab,
  argo: SiArgo,
  redhat: SiRedhat,
  redhatopenshift: SiRedhatopenshift,
  openstack: SiOpenstack,
  html: SiHtml5,
  css: SiCss,
  "c++": SiCplusplus,
  dotnet: SiDotnet,
  cisco: SiCisco,
};
