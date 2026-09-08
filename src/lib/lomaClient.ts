/**
 * Caseroom's calls to the server, from the browser.
 *
 * This is the standalone app's `api.js` with one thing taken out: the token.
 * There it read a JWT from localStorage and put it on every request; here the
 * requests go to this site's own `/api/loma/*`, and the httpOnly cookie the
 * proxy reads travels on its own. Nothing on this side of the wire knows what
 * the credential is, which is the point.
 *
 * The method names are deliberately unchanged from `api.js`, so the screens
 * ported from the standalone app call exactly what they always called.
 */

const BASE = "/api/loma";

/**
 * The paths are written as the FastAPI original had them ('/api/profile') and
 * rewritten here, exactly as the standalone client did. It keeps this file
 * diffable against the one it came from rather than renaming forty call sites.
 */
const url = (path: string) => BASE + path.replace(/^\/api/, "");

export class LomaError extends Error {
  readonly status: number;
  /** Set when the server named the failure — `SESSION_EXPIRED` is the one that matters. */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "LomaError";
    this.status = status;
    this.code = code;
  }
}

let leaving = false;

/**
 * Send them to sign in, and bring them back to where they were.
 *
 * A doctor can be signed in to the site and still have no live platform token:
 * the session lasts thirty days, the token seven, and someone who arrived
 * through the apply flow never had one. None of that is worth explaining on
 * screen. Signing in is what fixes every version of it, and `next` means they
 * return to the page they were on rather than the dashboard.
 *
 * `replace` rather than `assign`: the dead page should not be somewhere the
 * back button can return to.
 */
function toLogin(): void {
  if (typeof window === "undefined") return;
  // Screens fire several calls at once — the profile and the health check land
  // together — so an expired token produces more than one 401. The first one
  // starts the navigation; the rest must not restart it.
  if (leaving) return;
  leaving = true;

  const here = window.location.pathname + window.location.search;
  window.location.replace(`/login?next=${encodeURIComponent(here)}`);
}

/**
 * Whether an expired session should take the doctor to the login page.
 *
 * True inside Caseroom, where a screen that cannot load is the whole screen.
 * False for anything ambient — the Your Space pane asks LoMa for a summary
 * while sitting on a dashboard full of other working things, and throwing a
 * doctor off that page because one panel's token has lapsed would be a
 * dashboard that logs people out at random.
 */
type Options = { quiet?: boolean };

async function handle(res: Response, options?: Options): Promise<any> {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const code = typeof data?.code === "string" ? data.code : undefined;

    // Nothing downstream can recover from this, and every caller would only
    // rethrow it, so it is handled once here — unless the caller said it would
    // rather show its own quiet failure than move the page.
    if (res.status === 401 && !options?.quiet) {
      toLogin();
    }

    throw new LomaError(
      data?.detail || data?.message || `Request failed (${res.status})`,
      res.status,
      code,
    );
  }

  return data;
}

async function get(path: string, options?: Options) {
  return fetch(url(path), { credentials: "same-origin" }).then((res) => handle(res, options));
}

async function post(path: string, body?: unknown, options?: Options) {
  return fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body ?? {}),
  }).then((res) => handle(res, options));
}

export const loma = {
  health: () => get("/api/health"),
  getProfile: () => get("/api/profile"),
  /**
   * The same profile, for a surface that is not Caseroom itself.
   *
   * Fails silently rather than navigating: see `Options` above.
   */
  peekProfile: () => get("/api/profile", { quiet: true }),
  setName: (name: string) => post("/api/profile/name", { name }),
  setTopic: (topic: string) => post("/api/profile/topic", { topic }),

  // student side
  listCases: () => get("/api/cases"),
  joinProgram: (code: string) => post("/api/mentorship/join", { code }),
  setActiveProgram: (programId: number) => post("/api/profile/active-program", { program_id: programId }),

  // onboarding / placement
  onboardingStart: () => post("/api/onboarding/start"),
  onboardingSubmit: (body: unknown) => post("/api/onboarding/submit", body),

  // legend programs
  getPrograms: () => get("/api/legend/programs"),
  createProgram: (name: string) => post("/api/legend/programs", { name }),
  renameProgram: (programId: number, name: string) =>
    post("/api/legend/programs/rename", { program_id: programId, name }),
  getProgramGuardrails: (programId: number) => get(`/api/legend/programs/${programId}/guardrails`),
  setProgramGuardrails: (programId: number, config: Record<string, unknown>) =>
    post("/api/legend/programs/guardrails", { program_id: programId, ...config }),

  // legend roster (per program)
  getProgramStudents: (programId: number) => get(`/api/legend/programs/${programId}/students`),
  getStudentDetail: (programId: number, studentId: string) =>
    get(`/api/legend/programs/${programId}/students/${studentId}/detail`),
  getAttempt: (attemptId: number) => get(`/api/legend/attempts/${attemptId}`),
  approveStudent: (programId: number, studentId: string) =>
    post("/api/legend/students/approve", { program_id: programId, student_id: studentId }),
  rejectStudent: (programId: number, studentId: string) =>
    post("/api/legend/students/reject", { program_id: programId, student_id: studentId }),
  addStudent: (programId: number, email: string) =>
    post("/api/legend/students/add", { program_id: programId, email }),

  // legend repo review (per program)
  getProgramRepo: (programId: number) => get(`/api/legend/programs/${programId}/repo`),
  setCaseFeedback: (programId: number, caseId: number, verdict: string) =>
    post("/api/legend/repo/feedback", { program_id: programId, case_id: caseId, verdict }),

  // legend question authoring (per program)
  draftQuestion: (body: unknown) => post("/api/legend/questions/draft", body),
  createQuestion: (draft: unknown) => post("/api/legend/questions/create", draft),
  generateCases: (programId: number, body: Record<string, unknown>) =>
    post("/api/legend/programs/generate", { program_id: programId, ...body }),
  saveGeneratedCases: (programIds: number[], cases: unknown) =>
    post("/api/legend/programs/generate/save", { program_ids: programIds, cases }),

  // admin
  setRole: (email: string, role: string) => post("/api/admin/role", { email, role }),
  getAdminOverview: () => get("/api/admin/overview"),
  getAdminCases: () => get("/api/admin/cases"),
  setCaseStatus: (caseId: number, status: string) => post("/api/admin/case/status", { case_id: caseId, status }),

  // playing a case
  startCase: () => post("/api/case/start"),
  sendMessage: (sessionId: string, message: string) =>
    post("/api/case/message", { session_id: sessionId, message }),
  lockIn: (sessionId: string, diagnosis: string, reasoning: string, durationSec: number) =>
    post("/api/case/lockin", {
      session_id: sessionId,
      diagnosis,
      reasoning,
      duration_sec: durationSec,
    }),

  getCoach: () => post("/api/coach"),
  /** Iris, for a surface that is not Caseroom itself. See `peekProfile`. */
  getCoachQuiet: () => post("/api/coach", {}, { quiet: true }),
};
