import siteConfig from "../config/sites.json"

export const VIDEO_HOSTS: string[] = siteConfig.videoHosts
export const VIDEO_PRIMARY_ORIGIN = `https://${VIDEO_HOSTS[0]}`
export const VIDEO_HOME_URL = `${VIDEO_PRIMARY_ORIGIN}/`

export function isVideoHost(hostname: string) {
  return VIDEO_HOSTS.some((host) => host === hostname)
}
