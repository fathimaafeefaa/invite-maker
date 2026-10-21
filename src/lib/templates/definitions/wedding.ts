import type { TemplateDef } from "../types";

export const wedding: TemplateDef = {
  id: "wedding-classic",
  occasion: "wedding",
  name: "Classic Wedding",
  description: "An elegant serif invitation with a countdown and venue directions.",
  titleFields: ["partnerOne", "partnerTwo"],
  fields: [
    { key: "partnerOne", type: "text", label: "First name", group: "The couple", required: true, max: 60, placeholder: "Ruqiya" },
    { key: "partnerOneParents", type: "text", label: "Their parents", group: "The couple", max: 120, placeholder: "Daughter of Mr. A and Mrs. B" },
    { key: "partnerTwo", type: "text", label: "Second name", group: "The couple", required: true, max: 60, placeholder: "Arshakh" },
    { key: "partnerTwoParents", type: "text", label: "Their parents", group: "The couple", max: 120, placeholder: "Son of Mr. C and Mrs. D" },
    { key: "eventAt", type: "datetime", label: "Date and time", group: "When", required: true },
    { key: "message", type: "textarea", label: "Welcome note", group: "Message", max: 500, placeholder: "Join us as we celebrate..." },
    { key: "venueName", type: "text", label: "Venue name", group: "Where", required: true, max: 120 },
    { key: "venueAddress", type: "text", label: "Venue address", group: "Where", max: 200 },
    { key: "mapUrl", type: "url", label: "Google Maps link", group: "Where", help: "Paste the share link from Google Maps.", max: 500 },
    { key: "coverImage", type: "image", label: "Cover photo", group: "Photos" },
    { key: "gallery", type: "images", label: "Photo album", group: "Photos", max: 12 },
  ],
  sample: {
    partnerOne: "Ruqiya",
    partnerOneParents: "Daughter of Mr. Unnian Kutty and Mrs. Rasiya",
    partnerTwo: "Arshakh",
    partnerTwoParents: "Son of Mr. Mohammed Haneefa and Mrs. Sulaikha",
    eventAt: "2026-12-24T11:00",
    message: "With the blessings of our families, we joyfully invite you to celebrate our wedding. Your presence will make our day complete.",
    venueName: "Kanichirakkal Convention Center",
    venueAddress: "Amakkavu, Chalissery",
    mapUrl: "https://maps.google.com/?q=Chalissery",
  },
};
