import { afterEach, describe, expect, it, vi } from "vitest";
import { createAction, getActionPage, updateAction } from "../../src/api.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Actions Taken client API", () => {
  it("uses session credentials and the existing requester/staff pagination routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { items: [], pagination: { page: 2 } } }) });
    vi.stubGlobal("fetch", fetchMock);
    await getActionPage(501, "requester", 2);
    await getActionPage(501, "staff", 1);
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining("/api/tickets/501/actions?page=2&pageSize=100"), expect.objectContaining({ credentials: "include", method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/api/staff/tickets/501/actions?page=1&pageSize=100"), expect.objectContaining({ credentials: "include" }));
  });

  it("sends only approved fields and the Action version on PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { action: { id: 11 } } }) });
    vi.stubGlobal("fetch", fetchMock);
    const fields = { description: "Checked", result: "Fixed", followUpRequired: false, followUpNote: null, attachmentNotes: null };
    await createAction(501, fields);
    await updateAction(501, 11, fields, 3);
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(fields));
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ ...fields, version: 3 }));
    expect(fetchMock.mock.calls[1][0]).toContain("/api/staff/tickets/501/actions/11");
  });

  it("aborts a stalled POST after 30 seconds and reports an unknown result without retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    vi.stubGlobal("fetch", fetchMock);
    const request = createAction(501, { description: "Checked", result: "Fixed", followUpRequired: false, followUpNote: null, attachmentNotes: null });
    const assertion = expect(request).rejects.toMatchObject({ status: 0, code: "NETWORK_RESULT_UNKNOWN" });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
