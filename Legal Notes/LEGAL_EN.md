# Note on legality — BlameFlix

> **Language / Lingua**: **English** (this document) | [Italiano](LEGAL.md)

_Last updated: August 16, 2026_

> **Disclaimer.** This document has **purely informational** purposes and **does
> not constitute legal advice**. It was not written by a lawyer or a licensed
> professional: whoever wrote it is not a legal expert. The assessments contained
> in this document are based on a reasoned interpretation of the regulations and
> may therefore be **revised**, updated or corrected at any time. For binding
> opinions or specific matters (liability, jurisdiction, commercial use) refer
> to a licensed professional.

## 1. Premise

BlameFlix is a personal catalog and player: it searches titles, saves them to
your library and tracks watched episodes, release dates and notifications. All
the data stays on your device (local storage and backup files); the app has no
server and does not send your data to anyone.

The app is a private project, is not distributed commercially and earns nothing
in any way.

## 2. The app does not provide content

BlameFlix **does not**:

- host, embed or suggest content sources;
- provide or point to links to streaming, torrent or magnet sites;
- download or allow the download of protected works;
- index or know the sources the user accesses.

BlameFlix is a **neutral tool**: like a browser or a generic player, it only
shows metadata and interacts with what the user configures on their own.

## 3. The "source" feature

In the Settings you can configure a **URL template** (the "source") for the
«Watch now» feature. BlameFlix simply opens the URL you entered, replacing the
placeholders `{id}`, `{type}`, `{season}` and `{episode}` that you yourself put
in the template with the title's values. The app **does not build or append any
segment** to the URL: without placeholders, the URL is opened exactly as you
wrote it.

The source is **empty by default**: if you configure no template, the «Watch
now» button is inactive and the app opens nothing. BlameFlix includes no site
lists, addresses or suggested services, neither by default nor in any other
way: the only URL ever opened is the one you type.

The app accepts **exclusively `http` and `https` links**. Peer-to-peer
file-sharing protocols (for example `magnet`, `torrent`, `ed2k` and similar) are
rejected at configuration time and are never opened: BlameFlix cannot be used as
a file-sharing tool. This check blocks a **protocol category**, not single
sites: the app still does not know or judge any specific source.

The app **does not know or evaluate the content** of that URL: it does not know
whether the service you point to is legal or not, it does not query the page, it
does not extract videos or streams from it, it does not index it and it does not
make it available to third parties. It only calls the URL with the system
browser or player, exactly as would happen if you typed the same address by hand
in a browser.

The choice of which service to use, and therefore the legality of the content
you access through it, is **entirely yours**: BlameFlix does not provide or point
to any source of content, does not host works and does not facilitate any
specific service.

From a legal standpoint, the feature is comparable to a browser's address bar or
to a generic player's URL: a neutral tool that simply carries an address chosen
by the user. Whoever watches protected content without the consent of the rights
holders is personally responsible (see section 7), while the neutral tool does
not carry out any punishable conduct.

## 4. Data and TMDB

To search titles and show their data and images, BlameFlix uses the **public API
of The Movie Database (TMDB)**, according to its terms of service. The metadata
does not constitute audiovisual content: BlameFlix does not carry protected
works.

BlameFlix **is not affiliated with, endorsed or certified by TMDB**: the TMDB
logo shown in the app is used exclusively for attribution purposes, in
compliance with the official TMDB guidelines on logos and attribution.

## 5. Reference legal framework and why it does not apply to BlameFlix

BlameFlix was created in **Italy**. Copyright is protected at multiple levels,
which the app takes into account in its design.

The rules listed below punish those who **distribute, communicate to the public
or intermediate** protected works (and the network intermediaries who do not
comply with the authorities' orders). BlameFlix is a local client application,
without a server, that does not host or transmit content: it does not carry out
any of the conduct these rules target.

**International**

- Berne Convention for the Protection of Literary and Artistic Works (1886);
- Agreement on Trade-Related Aspects of Intellectual Property Rights — TRIPS (1994);
- WIPO Copyright Treaty — WCT (1996).

The Berne Convention, TRIPS and the WCT bind States to ensure protection and
sanctions against the **unauthorized dissemination** of works. They do not
sanction the mere existence of a private tool: BlameFlix does not distribute,
reproduce or bypass protections (no DRM circumvented).

**European Union**

- Directive 2001/29/EC (harmonisation of copyright in the information society — "InfoSoc");
- Directive 2004/48/EC (enforcement of intellectual property rights);
- Directive (EU) 2019/790 (copyright in the Digital Single Market — "Copyright").

The European directives harmonise the rights of reproduction and **communication
to the public** and the responsibility of **platforms** for user-uploaded
content. BlameFlix is not a sharing platform: it makes no uploads, does not make
works available to the public and is not an online service accessed by third
parties.

**Italy** (the app's country of creation)

- Law of 22 April 1941, No. 633 (copyright protection), in particular arts. 171
  and 171-ter (criminal penalties for abusive dissemination);
- Legislative Decree 68/2003 (implementation of Directive 2001/29/EC);
- Legislative Decree 70/2003 (electronic commerce);
- Law of 14 July 2023, No. 93 (prevention and repression of the unlawful
  dissemination of protected content through electronic communications
  networks), in force since 8 August 2023, as subsequently amended
  (L. 143/2024);
- AGCOM Regulation on copyright protection over electronic communications
  networks (Resolution 680/13/CONS) as subsequently amended (Resolutions
  189/23/CONS and 209/25/CONS);
- Administrative sanctions: art. 174-ter of L. 633/1941 and art. 1, paragraph
  31, of L. 249/1997.

In Italy L. 633/1941 punishes those who reproduce and **abusively distribute**
protected works; L. 93/2023 targets **unlawful dissemination** over the networks
and the addressees of the blocks are the content providers and the network
intermediaries (ISPs, registrars, hosting), not a client app. The AGCOM
Regulation governs the blocking of sites **structurally dedicated to piracy**
addressed to intermediaries: BlameFlix is not a site, is not an intermediary
and does not provide or point to sources. The administrative sanctions
(art. 174-ter L. 633/1941 and art. 1, paragraph 31, L. 249/1997) respectively
target online dissemination and those who **do not comply with AGCOM orders**:
neither has a private app without content as its addressee.

BlameFlix falls into the category of **neutral tools** (browsers, generic
players): none of the cited rules sanctions the existence of a personal catalog
that does not carry content.

## 6. BlameFlix's position

**BlameFlix is not sanctioned, neither criminally nor administratively, by any
of the laws cited in section 5.** It does not carry out any of the conducts they
prohibit: it does not distribute, does not communicate to the public, does not
make available or link protected works, does not bypass protections and is not a
network intermediary.

**The AGCOM Regulation, the main Italian tool to fight online piracy, is
addressed to those who distribute content and to network intermediaries, and not
to users of neutral tools such as players or browsers.**

**The responsibility for the legality of the content you access through your
source is yours, according to the laws of your country. BlameFlix does not
provide or point to any source of content.**

## 7. User responsibility

**The responsibility for the content you access falls entirely on you, the end
user.** If you watch copyright-protected products without the consent of the
rights holders, you are the one who answers for it, according to the laws of
your country, and not BlameFlix, which does not provide or point to any source
of content.

In Italy, accessing protected content distributed without authorization may
entail administrative sanctions under L. 633/1941; stricter measures are under
discussion. The regulations vary from country to country.

Recommendation: use BlameFlix exclusively with authorized streaming services,
subscriptions and legal platforms.

## 8. Startup disclaimer

On **first use** BlameFlix shows a notice declaring the ownership of the
application, the protection under copyright law and the European and Italian
rules applicable to viewing content subject to intellectual property. The notice
clarifies that the owner assumes no responsibility for illegal use of the
application and reserves every right, reason and action for their protection,
including recourse to the competent authorities should the user's unlawful use
cause them any harm of any kind.

The program starts **only after the acceptance** of these conditions (the button
enables 10 seconds after the notice appears). The acceptance is remembered on
the device and is not requested again on subsequent openings. This notice does
not change the substance of what is described in this document: it confirms that
the responsibility for the use remains with the user and that the developer
declines any responsibility for uses not compliant with the law.