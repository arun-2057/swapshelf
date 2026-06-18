import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// POST /api/seed
// Create rich demo data for the current user IF they have no items yet:
//  - 6-8 items owned by the current user
//  - 3-4 neighbor users within ~3 miles, each owning items
//  - 1-2 sample loans with messages + a meetup spot
// Centered on the current user's lat/lon (defaults to NYC if 0,0).
export const POST = withErrorHandler(async () => {
  const me = await requireUser();

  // Don't re-seed.
  const existingItems = await db.item.count({ where: { ownerId: me.id } });
  if (existingItems > 0) {
    return NextResponse.json({ ok: true });
  }

  // Center coordinates — default to NYC if user is still at 0,0.
  let centerLat = me.latitude;
  let centerLon = me.longitude;
  if (centerLat === 0 && centerLon === 0) {
    centerLat = 40.7282;
    centerLon = -73.9942;
  }

  const ph = (title: string, seed: string) =>
    `https://placehold.co/300x450/${seed}/f5e6c8?text=${encodeURIComponent(
      title
    )}`;

  // --- Current user's own shelf ---
  const myItems = [
    {
      title: "The Name of the Wind",
      type: "BOOK" as const,
      creator: "Patrick Rothfuss",
      condition: "LIKE_NEW" as const,
      description: "Hardcover, first edition. Barely creased spine.",
      seed: "2d4a3e",
    },
    {
      title: "Dune",
      type: "BOOK" as const,
      creator: "Frank Herbert",
      condition: "GOOD" as const,
      description: "Paperback with light cover wear. A classic.",
      seed: "4a2d3e",
    },
    {
      title: "The Midnight Library",
      type: "BOOK" as const,
      creator: "Matt Haig",
      condition: "NEW" as const,
      description: "Bought two copies by mistake. Still in shrink wrap.",
      seed: "3e2d4a",
    },
    {
      title: "Where the Crawdads Sing",
      type: "BOOK" as const,
      creator: "Delia Owens",
      condition: "GOOD" as const,
      description: "Lightly read. Great beach book.",
      seed: "4a3e2d",
    },
    {
      title: "Catan",
      type: "BOARD_GAME" as const,
      creator: "Klaus Teuber",
      condition: "LIKE_NEW" as const,
      description: "Base game + 5-6 player extension. All pieces bagged.",
      seed: "2d3e4a",
    },
    {
      title: "Wingspan",
      type: "BOARD_GAME" as const,
      creator: "Elizabeth Hargrave",
      condition: "NEW" as const,
      description: "Un punched. Beautiful bird game.",
      seed: "3e4a2d",
    },
    {
      title: "Terraforming Mars",
      type: "BOARD_GAME" as const,
      creator: "Jacob Fryxelius",
      condition: "GOOD" as const,
      description: "Well-loved copy. Slight box wear, components perfect.",
      seed: "4a2d3e",
    },
    {
      title: "Azul",
      type: "BOARD_GAME" as const,
      creator: "Michael Kiesling",
      condition: "LIKE_NEW" as const,
      description: "Quick to teach. Great gateway game.",
      seed: "2d4a3e",
    },
  ];

  await db.item.createMany({
    data: myItems.map((i) => ({
      ownerId: me.id,
      title: i.title,
      type: i.type,
      creator: i.creator,
      condition: i.condition,
      description: i.description,
      imageUrl: ph(i.title, i.seed),
      status: "AVAILABLE",
    })),
  });

  // --- Neighbor users near the current user ---
  // Spread them out within ~3 miles using small lat/lon offsets.
  // ~69 miles per degree of latitude; longitude offset depends on cos(lat).
  const latMile = 1 / 69;
  const lonMile = 1 / (69 * Math.cos((centerLat * Math.PI) / 180));

  const neighbors = [
    {
      name: "Maya Chen",
      email: "maya.chen.swapshelf@example.com",
      neighborhood: "Maple Heights",
      swapScore: 92,
      offsetLat: 0.018,
      offsetLon: -0.012,
      bio: "Sci-fi & strategy gamer. Always up for a trade.",
      avatarUrl: ph("Maya", "2d4a3e"),
      items: [
        {
          title: "Project Hail Mary",
          type: "BOOK" as const,
          creator: "Andy Weir",
          condition: "LIKE_NEW" as const,
          seed: "4a2d3e",
        },
        {
          title: "Children of Time",
          type: "BOOK" as const,
          creator: "Adrian Tchaikovsky",
          condition: "GOOD" as const,
          seed: "3e2d4a",
        },
        {
          title: "Scythe",
          type: "BOOK" as const,
          creator: "Neal Shusterman",
          condition: "NEW" as const,
          seed: "4a3e2d",
        },
        {
          title: "Gloomhaven: Jaws of the Lion",
          type: "BOARD_GAME" as const,
          creator: "Isaac Childres",
          condition: "LIKE_NEW" as const,
          seed: "2d3e4a",
        },
      ],
    },
    {
      name: "Diego Rivera",
      email: "diego.rivera.swapshelf@example.com",
      neighborhood: "Riverside",
      swapScore: 78,
      offsetLat: -0.022,
      offsetLon: 0.014,
      bio: "Cozy mysteries and eurogames.",
      avatarUrl: ph("Diego", "3e2d4a"),
      items: [
        {
          title: "The Thursday Murder Club",
          type: "BOOK" as const,
          creator: "Richard Osman",
          condition: "GOOD" as const,
          seed: "2d4a3e",
        },
        {
          title: "The Martian",
          type: "BOOK" as const,
          creator: "Andy Weir",
          condition: "LIKE_NEW" as const,
          seed: "4a3e2d",
        },
        {
          title: "Verdant",
          type: "BOARD_GAME" as const,
          creator: "Molly Johnson",
          condition: "NEW" as const,
          seed: "3e4a2d",
        },
        {
          title: "Codenames",
          type: "BOARD_GAME" as const,
          creator: "Vlaada Chvátil",
          condition: "GOOD" as const,
          seed: "2d3e4a",
        },
      ],
    },
    {
      name: "Priya Anand",
      email: "priya.anand.swapshelf@example.com",
      neighborhood: "Old Town",
      swapScore: 65,
      offsetLat: 0.026,
      offsetLon: 0.019,
      bio: "Literary fiction lover. Slow reads welcome.",
      avatarUrl: ph("Priya", "4a3e2d"),
      items: [
        {
          title: "Pachinko",
          type: "BOOK" as const,
          creator: "Min Jin Lee",
          condition: "LIKE_NEW" as const,
          seed: "2d4a3e",
        },
        {
          title: "Less",
          type: "BOOK" as const,
          creator: "Andrew Sean Greer",
          condition: "GOOD" as const,
          seed: "3e2d4a",
        },
        {
          title: "The Seven Husbands of Evelyn Hugo",
          type: "BOOK" as const,
          creator: "Taylor Jenkins Reid",
          condition: "NEW" as const,
          seed: "4a2d3e",
        },
        {
          title: "Spirit Island",
          type: "BOARD_GAME" as const,
          creator: "R. Eric Reuss",
          condition: "LIKE_NEW" as const,
          seed: "2d3e4a",
        },
      ],
    },
    {
      name: "Tomás Whitfield",
      email: "tomas.whitfield.swapshelf@example.com",
      neighborhood: "Cedar Grove",
      swapScore: 84,
      offsetLat: -0.015,
      offsetLon: -0.024,
      bio: "Epic fantasy and heavy euros.",
      avatarUrl: ph("Tomás", "3e4a2d"),
      items: [
        {
          title: "The Way of Kings",
          type: "BOOK" as const,
          creator: "Brandon Sanderson",
          condition: "GOOD" as const,
          seed: "2d4a3e",
        },
        {
          title: "Mistborn: The Final Empire",
          type: "BOOK" as const,
          creator: "Brandon Sanderson",
          condition: "LIKE_NEW" as const,
          seed: "4a2d3e",
        },
        {
          title: "Brass: Birmingham",
          type: "BOARD_GAME" as const,
          creator: "Martin Wallace",
          condition: "LIKE_NEW" as const,
          seed: "3e4a2d",
        },
        {
          title: "Ark Nova",
          type: "BOARD_GAME" as const,
          creator: "Mathias Wigge",
          condition: "NEW" as const,
          seed: "2d4a3e",
        },
      ],
    },
  ];

  const createdNeighbors = [];
  for (const n of neighbors) {
    const lat = centerLat + n.offsetLat;
    const lon = centerLon + n.offsetLon;
    const user = await db.user.create({
      data: {
        name: n.name,
        email: n.email,
        passwordHash: hashPassword("swapshelf-demo"),
        bio: n.bio,
        avatarUrl: n.avatarUrl,
        latitude: lat,
        longitude: lon,
        neighborhood: n.neighborhood,
        swapScore: n.swapScore,
      },
    });

    for (const it of n.items) {
      await db.item.create({
        data: {
          ownerId: user.id,
          title: it.title,
          type: it.type,
          creator: it.creator,
          condition: it.condition,
          imageUrl: ph(it.title, it.seed),
          status: "AVAILABLE",
        },
      });
    }

    createdNeighbors.push(user);
  }

  // --- Sample loans (1 as borrower, 1 as lender) ---
  const [maya, diego] = createdNeighbors;

  // Loan 1: I'm borrowing Maya's "Project Hail Mary"
  const mayaItem = await db.item.findFirst({
    where: { ownerId: maya.id, title: "Project Hail Mary" },
  });
  if (mayaItem) {
    const loan1 = await db.loan.create({
      data: {
        itemId: mayaItem.id,
        borrowerId: me.id,
        lenderId: maya.id,
        status: "BORROWED",
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 11),
      },
    });
    await db.item.update({
      where: { id: mayaItem.id },
      data: { status: "BORROWED" },
    });

    await db.meetupSpot.create({
      data: {
        loanId: loan1.id,
        name: "Maple & Vine Coffee House",
        address: "442 Maple Avenue",
        latitude: centerLat + 0.005,
        longitude: centerLon - 0.003,
        suggestedBy: maya.id,
        agreedBy: me.id,
        status: "agreed",
      },
    });

    await db.message.createMany({
      data: [
        {
          loanId: loan1.id,
          senderId: me.id,
          text: "Hi Maya! Could I borrow Project Hail Mary this week?",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        },
        {
          loanId: loan1.id,
          senderId: maya.id,
          text: "Of course! I'll bring it to Maple & Vine on Saturday at 10.",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3.8),
        },
        {
          loanId: loan1.id,
          senderId: me.id,
          text: "Perfect — see you then. Thanks so much!",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3.7),
        },
        {
          loanId: loan1.id,
          senderId: maya.id,
          text: "No rush, enjoy it. Two weeks is fine.",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        },
      ],
    });
  }

  // Loan 2: Diego is borrowing my "Dune"
  const myDune = await db.item.findFirst({
    where: { ownerId: me.id, title: "Dune" },
  });
  if (myDune) {
    const loan2 = await db.loan.create({
      data: {
        itemId: myDune.id,
        borrowerId: diego.id,
        lenderId: me.id,
        status: "ACCEPTED",
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });
    await db.item.update({
      where: { id: myDune.id },
      data: { status: "REQUESTED" },
    });

    await db.meetupSpot.create({
      data: {
        loanId: loan2.id,
        name: "Riverside Park Pavilion",
        address: "78 Riverwalk West",
        latitude: centerLat - 0.007,
        longitude: centerLon + 0.004,
        suggestedBy: diego.id,
        agreedBy: null,
        status: "proposed",
      },
    });

    await db.message.createMany({
      data: [
        {
          loanId: loan2.id,
          senderId: diego.id,
          text: "Hey! I've been meaning to read Dune for ages. Could I borrow it?",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        },
        {
          loanId: loan2.id,
          senderId: me.id,
          text: "Absolutely. Want to meet at Riverside Park tomorrow afternoon?",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.8),
        },
        {
          loanId: loan2.id,
          senderId: diego.id,
          text: "Sounds great — 3pm at the pavilion?",
          systemEvent: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.5),
        },
      ],
    });
  }

  return NextResponse.json({ ok: true });
});
