import { createLucideIcon } from "lucide-react";

// Sport icons drawn on lucide's 24px grid so they match the rest of the icon set.

/** Bat and ball. */
export const Cricket = createLucideIcon("cricket", [
  ["path", { d: "M20.6 3.4a1.5 1.5 0 0 1 0 2.1L11 15.1 8.9 13 18.5 3.4a1.5 1.5 0 0 1 2.1 0Z", key: "blade" }],
  ["path", { d: "M8.9 15.1 4 20", key: "handle" }],
  ["circle", { cx: "6", cy: "6", r: "2.5", key: "ball" }],
]);

export const Football = createLucideIcon("football", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "ball" }],
  ["path", { d: "m12 7.5 4.3 3.1-1.6 5H9.3l-1.6-5Z", key: "patch" }],
  ["path", { d: "M12 2v5.5M16.3 10.6l5.2-1.7M14.7 15.6l3.2 4.4M9.3 15.6l-3.2 4.4M7.7 10.6 2.5 8.9", key: "seams" }],
]);

export const Basketball = createLucideIcon("basketball", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "ball" }],
  ["path", { d: "M12 2v20M2 12h20", key: "cross" }],
  ["path", { d: "M5 4.9c3.6 3.7 3.6 10.5 0 14.2M19 4.9c-3.6 3.7-3.6 10.5 0 14.2", key: "curves" }],
]);

export const Shuttlecock = createLucideIcon("shuttlecock", [
  ["circle", { cx: "6.5", cy: "17.5", r: "3", key: "cork" }],
  ["path", { d: "M8.6 15.4 13.5 4 20 10.5Z", key: "skirt" }],
  ["path", { d: "m11 13 5.8-5.8", key: "feather" }],
]);

export const Racket = createLucideIcon("racket", [
  ["circle", { cx: "14", cy: "10", r: "6.5", key: "head" }],
  ["path", { d: "M9.4 14.6 3.5 20.5", key: "handle" }],
  ["path", { d: "M10.5 6.5l7 7M17.5 6.5l-7 7", key: "strings" }],
]);

export const Paddle = createLucideIcon("paddle", [
  ["path", { d: "M18.4 15.2a7 7 0 1 0-9.6-9.6 7 7 0 0 0 0 7.8L4 18.2 5.8 20l4.8-4.8a7 7 0 0 0 7.8 0Z", key: "blade" }],
  ["circle", { cx: "19.5", cy: "19.5", r: "1.5", key: "ball" }],
]);

export const HockeyStick = createLucideIcon("hockey-stick", [
  ["path", { d: "M16 2 9.2 17.2A3 3 0 0 1 6.5 19H3", key: "stick" }],
  ["circle", { cx: "17.5", cy: "18", r: "2.5", key: "ball" }],
]);

export { Footprints as KhoKho, HandFist as Kabaddi, Volleyball, Whistle } from "lucide-react";
