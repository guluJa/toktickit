import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import * as ticketNumberModule from "../../src/ticket-number.js";

const prisma = getPrisma();

const validSubmissionKey =
    "c65a1f36-f8ca-4a61-8947-44edc4176d01";

const replaySubmissionKey =
    "c65a1f36-f8ca-4a61-8947-44edc4176d02";

const concurrentSubmissionKey =
    "c65a1f36-f8ca-4a61-8947-44edc4176d06";

const collisionSubmissionKey =
    "c65a1f36-f8ca-4a61-8947-44edc4176d07";

const existingCollisionSubmissionKey =
    "c65a1f36-f8ca-4a61-8947-44edc4176d08";

let requesterId: number;
let categoryId: number;
let relatedSystemId: number;

describe("POST /api/tickets", () => {
    beforeAll(async () => {
        const requester =
            await prisma.requesterUser.findUnique({
                where: {
                    email: "requester1@toktickit.test",
                },
            });

        const category =
            await prisma.category.findUnique({
                where: {
                    name: "Hardware",
                },
            });

        const relatedSystem =
            await prisma.relatedSystem.findUnique({
                where: {
                    name: "Campus Wi-Fi",
                },
            });

        if (
            !requester ||
            !category ||
            !relatedSystem
        ) {
            throw new Error(
                "Lab 2 seed data is required before running Create Ticket tests.",
            );
        }

        requesterId = requester.id;
        categoryId = category.id;
        relatedSystemId = relatedSystem.id;

        await prisma.ticket.deleteMany({
            where: {
                requesterId,
                submissionKey: {
                    in: [
                        validSubmissionKey,
                        replaySubmissionKey,
                        concurrentSubmissionKey,
                        collisionSubmissionKey,
                        existingCollisionSubmissionKey,
                    ],
                },
            },
        });
    });

    afterAll(async () => {
        if (requesterId) {
            await prisma.ticket.deleteMany({
                where: {
                    requesterId,
                    submissionKey: {
                        in: [
                            validSubmissionKey,
                            replaySubmissionKey,
                            concurrentSubmissionKey,
                            collisionSubmissionKey,
                            existingCollisionSubmissionKey,
                        ],
                    },
                },
            });
        }
    });

    it(
        "creates a Ticket for the current Development Requester",
        async () => {
            const res = await request(app)
                .post("/api/tickets")
                .set(
                    "X-Development-Requester-Id",
                    String(requesterId),
                )
                .send({
                    submissionKey:
                        validSubmissionKey,
                    categoryId,
                    relatedSystemId,
                    summary:
                        "  Laptop cannot connect to Wi-Fi  ",
                    requestedPriority: "MEDIUM",
                    description:
                        "  The connection disconnects after a few minutes.  ",
                });

            expect(res.status).toBe(201);
            expect(res.body.replayed).toBe(false);

            expect(res.body.ticket).toEqual({
                id: expect.any(Number),
                ticketNumber: expect.stringMatching(
                    /^TKT-\d{8}-[A-F0-9]{6}$/,
                ),
                requester: {
                    id: requesterId,
                    name:
                        "Development Requester 1",
                    email:
                        "requester1@toktickit.test",
                },
                category: {
                    id: categoryId,
                    name: "Hardware",
                },
                relatedSystem: {
                    id: relatedSystemId,
                    name: "Campus Wi-Fi",
                },
                summary:
                    "Laptop cannot connect to Wi-Fi",
                requestedPriority: "MEDIUM",
                description:
                    "The connection disconnects after a few minutes.",
                currentStatus: "NEW",
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
                attachments: [],
            });

            const savedTicket =
                await prisma.ticket.findUnique({
                    where: {
                        requesterId_submissionKey: {
                            requesterId,
                            submissionKey:
                                validSubmissionKey,
                        },
                    },
                });

            expect(savedTicket).not.toBeNull();
            expect(savedTicket).toMatchObject({
                requesterId,
                categoryId,
                relatedSystemId,
                submissionKey:
                    validSubmissionKey,
                summary:
                    "Laptop cannot connect to Wi-Fi",
                requestedPriority: "MEDIUM",
                description:
                    "The connection disconnects after a few minutes.",
                currentStatus: "NEW",
            });
        },
    );

    it("replays the existing Ticket when the same requester uses the same submissionKey", async () => {
        const requestBody = {
            submissionKey: replaySubmissionKey,
            categoryId,
            relatedSystemId,
            summary: "Cannot connect to campus Wi-Fi",
            requestedPriority: "HIGH",
            description:
                "The requester cannot connect to the campus wireless network.",
        };

        const firstResponse = await request(app)
            .post("/api/tickets")
            .set(
                "X-Development-Requester-Id",
                String(requesterId),
            )
            .send(requestBody);

        const replayResponse = await request(app)
            .post("/api/tickets")
            .set(
                "X-Development-Requester-Id",
                String(requesterId),
            )
            .send(requestBody);

        expect(firstResponse.status).toBe(201);
        expect(firstResponse.body.replayed).toBe(false);

        expect(replayResponse.status).toBe(200);
        expect(replayResponse.body.replayed).toBe(true);

        expect(replayResponse.body.ticket.id).toBe(
            firstResponse.body.ticket.id,
        );

        expect(
            replayResponse.body.ticket.ticketNumber,
        ).toBe(
            firstResponse.body.ticket.ticketNumber,
        );

        const savedTicketCount =
            await prisma.ticket.count({
                where: {
                    requesterId,
                    submissionKey:
                        replaySubmissionKey,
                },
            });

        expect(savedTicketCount).toBe(1);
    });

    it("replays one concurrent request when the same requester submits the same submissionKey", async () => {
        const requestBody = {
            submissionKey: concurrentSubmissionKey,
            categoryId,
            relatedSystemId,
            summary: "Concurrent Ticket submission",
            requestedPriority: "MEDIUM",
            description:
                "Two concurrent requests must create only one Ticket.",
        };

        const [firstResponse, secondResponse] =
            await Promise.all([
                request(app)
                    .post("/api/tickets")
                    .set(
                        "X-Development-Requester-Id",
                        String(requesterId),
                    )
                    .send(requestBody),
                request(app)
                    .post("/api/tickets")
                    .set(
                        "X-Development-Requester-Id",
                        String(requesterId),
                    )
                    .send(requestBody),
            ]);

        expect(
            [firstResponse.status, secondResponse.status].sort(),
        ).toEqual([200, 201]);

        expect(
            [
                firstResponse.body.replayed,
                secondResponse.body.replayed,
            ].sort(),
        ).toEqual([false, true]);

        expect(firstResponse.body.ticket.id).toBe(
            secondResponse.body.ticket.id,
        );

        expect(
            await prisma.ticket.count({
                where: {
                    requesterId,
                    submissionKey: concurrentSubmissionKey,
                },
            }),
        ).toBe(1);
    });

    it("retries Ticket Number allocation after a unique-number collision", async () => {
        const collidingTicketNumber =
            "TKT-20991231-ABCDEF";
        const allocatedTicketNumber =
            "TKT-20991231-FEDCBA";

        await prisma.ticket.create({
            data: {
                ticketNumber: collidingTicketNumber,
                requesterId,
                submissionKey:
                    existingCollisionSubmissionKey,
                categoryId,
                relatedSystemId,
                summary: "Existing Ticket Number",
                requestedPriority: "LOW",
                description:
                    "This record reserves the first generated Ticket Number.",
                currentStatus: "NEW",
            },
        });

        const numberSpy = vi
            .spyOn(
                ticketNumberModule,
                "generateTicketNumber",
            )
            .mockReturnValueOnce(collidingTicketNumber)
            .mockReturnValueOnce(allocatedTicketNumber);

        try {
            const response = await request(app)
                .post("/api/tickets")
                .set(
                    "X-Development-Requester-Id",
                    String(requesterId),
                )
                .send({
                    submissionKey: collisionSubmissionKey,
                    categoryId,
                    relatedSystemId,
                    summary: "Retry Ticket Number allocation",
                    requestedPriority: "HIGH",
                    description:
                        "The API must retry after the first Ticket Number collides.",
                });

            expect(response.status).toBe(201);
            expect(response.body.replayed).toBe(false);
            expect(
                response.body.ticket.ticketNumber,
            ).toBe(allocatedTicketNumber);
            expect(numberSpy).toHaveBeenCalledTimes(2);
        } finally {
            numberSpy.mockRestore();
        }
    });

    it("returns field errors and does not save a Ticket for invalid input", async () => {
        const submissionKey =
            "c65a1f36-f8ca-4a61-8947-44edc4176d03";

        await prisma.ticket.deleteMany({
            where: {
                requesterId,
                submissionKey,
            },
        });

        const res = await request(app)
            .post("/api/tickets")
            .set(
                "X-Development-Requester-Id",
                String(requesterId),
            )
            .send({
                submissionKey,
                categoryId,
                relatedSystemId,
                summary: "1234",
                requestedPriority: "MEDIUM",
                description:
                    "This description has a valid length.",
                requesterId,
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe(
            "VALIDATION_ERROR",
        );
        expect(
            res.body.error.fields.summary,
        ).toEqual(expect.any(String));
        expect(
            res.body.error.fields.requesterId,
        ).toEqual(expect.any(String));

        const savedTicketCount =
            await prisma.ticket.count({
                where: {
                    requesterId,
                    submissionKey,
                },
            });

        expect(savedTicketCount).toBe(0);
    });

    it("rejects inactive Category and Related System without saving a Ticket", async () => {
        const submissionKey =
            "c65a1f36-f8ca-4a61-8947-44edc4176d04";

        const inactiveCategory =
            await prisma.category.upsert({
                where: {
                    name:
                        "__Lab 2 inactive create category__",
                },
                update: {
                    isActive: false,
                },
                create: {
                    name:
                        "__Lab 2 inactive create category__",
                    isActive: false,
                },
            });

        const inactiveRelatedSystem =
            await prisma.relatedSystem.upsert({
                where: {
                    name:
                        "__Lab 2 inactive create system__",
                },
                update: {
                    description:
                        "Inactive test reference",
                    isActive: false,
                },
                create: {
                    name:
                        "__Lab 2 inactive create system__",
                    description:
                        "Inactive test reference",
                    isActive: false,
                },
            });

        try {
            const res = await request(app)
                .post("/api/tickets")
                .set(
                    "X-Development-Requester-Id",
                    String(requesterId),
                )
                .send({
                    submissionKey,
                    categoryId:
                        inactiveCategory.id,
                    relatedSystemId:
                        inactiveRelatedSystem.id,
                    summary:
                        "Inactive reference test",
                    requestedPriority: "LOW",
                    description:
                        "This Ticket must not be created with inactive reference data.",
                });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe(
                "VALIDATION_ERROR",
            );
            expect(
                res.body.error.fields.categoryId,
            ).toEqual(expect.any(String));
            expect(
                res.body.error.fields
                    .relatedSystemId,
            ).toEqual(expect.any(String));

            const savedTicketCount =
                await prisma.ticket.count({
                    where: {
                        requesterId,
                        submissionKey,
                    },
                });

            expect(savedTicketCount).toBe(0);
        } finally {
            await prisma.ticket.deleteMany({
                where: {
                    requesterId,
                    submissionKey,
                },
            });

            await prisma.category.deleteMany({
                where: {
                    id: inactiveCategory.id,
                },
            });

            await prisma.relatedSystem.deleteMany({
                where: {
                    id:
                        inactiveRelatedSystem.id,
                },
            });
        }
    });

    it("returns a safe 500 response without saving a partial Ticket", async () => {
        const submissionKey =
            "c65a1f36-f8ca-4a61-8947-44edc4176d05";

        await prisma.ticket.deleteMany({
            where: {
                requesterId,
                submissionKey,
            },
        });

        const internalErrorMessage =
            "Prisma database failure with private SQL and password details";

        const transactionSpy = vi
            .spyOn(prisma, "$transaction")
            .mockRejectedValueOnce(
                new Error(
                    internalErrorMessage,
                ),
            );

        try {
            const res = await request(app)
                .post("/api/tickets")
                .set(
                    "X-Development-Requester-Id",
                    String(requesterId),
                )
                .send({
                    submissionKey,
                    categoryId,
                    relatedSystemId,
                    summary:
                        "Unexpected database failure",
                    requestedPriority: "HIGH",
                    description:
                        "This request verifies that unexpected database errors remain private.",
                });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({
                error: {
                    code: "INTERNAL_ERROR",
                    message:
                        "Unable to create the Ticket.",
                },
            });

            const serializedResponse =
                JSON.stringify(res.body);

            expect(
                serializedResponse,
            ).not.toContain(
                internalErrorMessage,
            );
            expect(
                serializedResponse,
            ).not.toContain("Prisma");
            expect(
                serializedResponse,
            ).not.toContain("SQL");
            expect(
                serializedResponse,
            ).not.toContain("password");
            expect(
                serializedResponse,
            ).not.toContain("stack");

            const savedTicketCount =
                await prisma.ticket.count({
                    where: {
                        requesterId,
                        submissionKey,
                    },
                });

            expect(savedTicketCount).toBe(0);
        } finally {
            transactionSpy.mockRestore();

            await prisma.ticket.deleteMany({
                where: {
                    requesterId,
                    submissionKey,
                },
            });
        }
    });
});
