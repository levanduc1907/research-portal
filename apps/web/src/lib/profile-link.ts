export interface ProfileLinkMetadata {
  label: string;
}

const UNIVERSITY_PROFILE: ProfileLinkMetadata = {
  label: "University profile",
};

const OPENALEX_PROFILE: ProfileLinkMetadata = {
  label: "OpenAlex profile",
};

const EXTERNAL_PROFILE: ProfileLinkMetadata = {
  label: "External profile",
};

function belongsToDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getProfileLinkMetadata(url: string): ProfileLinkMetadata {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (belongsToDomain(hostname, "openalex.org")) {
      return OPENALEX_PROFILE;
    }

    if (belongsToDomain(hostname, "illinois.edu")) {
      return UNIVERSITY_PROFILE;
    }
  } catch {
    return EXTERNAL_PROFILE;
  }

  return EXTERNAL_PROFILE;
}
