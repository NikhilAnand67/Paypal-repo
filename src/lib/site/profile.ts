export const siteProfile = {
  name: "Nikhil Anand",
  role: "Designer and developer of PayPilot AI",
  links: {
    github: {
      label: "GitHub",
      placeholder: "[YOUR GITHUB PROFILE]",
      href: "https://github.com/NikhilAnand67",
    },
    linkedin: {
      label: "LinkedIn",
      placeholder: "[YOUR LINKEDIN PROFILE]",
      href: "https://www.linkedin.com/in/nikhil-anand-00b056382",
    },
    email: {
      label: "Email",
      placeholder: "[YOUR EMAIL ADDRESS]",
      href: "mailto:codingboy465@gmail.com",
    },
  },
} as const;

export type ProfileLink = (typeof siteProfile.links)[keyof typeof siteProfile.links];
