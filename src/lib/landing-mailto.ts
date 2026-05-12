const enc = (s: string) => encodeURIComponent(s);

export const MAIL_DEMO = `https://mail.google.com/mail/?view=cm&to=bunifuyouthskenya@gmail.com&su=${enc("Book a demo BrailleEd")}`;

export const MAIL_KIT = `https://mail.google.com/mail/?view=cm&to=bunifuyouthskenya@gmail.com&su=${enc("Kit inquiry  BrailleEd")}`;

export const MAIL_PLAIN = "mailto:bunifuyouthskenya@gmail.com";