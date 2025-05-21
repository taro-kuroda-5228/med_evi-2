import { db } from "~/server/db";
import {
  requestMultimodalModel,
  queueTask,
  getTaskStatus,
} from "~/server/actions";
import { z } from "zod";

// Define a constant for the standard system prompt
const STANDARD_SYSTEM_PROMPT =
  "You are a medical research assistant that provides evidence-based answers to medical questions. Your primary sources are PubMed abstracts which you must cite using PMID numbers. You can supplement this with information from reliable web sources.";

// Session management
let currentUserId: string | null = null;

// Session token storage - for in-memory sessions during the current server instance
const sessionTokens = new Map<string, string>();

// Session token validation using a secure hash function
function validateSessionToken(token: string, userId: string): boolean {
  if (!token || !userId) {
    console.log("Invalid token or userId provided to validateSessionToken");
    return false;
  }

  // First check in-memory map for best performance
  if (sessionTokens.has(token)) {
    const storedUserId = sessionTokens.get(token);
    const isValid = storedUserId === userId;
    console.log(
      `In-memory token validation for ${token.substring(0, 5)}...: ${isValid ? "valid" : "invalid"}`,
    );
    return isValid;
  }

  // Fallback validation for persistent tokens
  try {
    // Extract user ID prefix from token (first part before first delimiter)
    const parts = token.split("_");
    if (parts.length > 1) {
      const encodedPrefix = parts[0];
      // Compare with the first 8 chars of userId
      const userIdPrefix = userId.substring(0, 8);
      const expectedPrefix = Buffer.from(userIdPrefix)
        .toString("base64")
        .replace(/=/g, "");
      const isValid = encodedPrefix === expectedPrefix;

      console.log(
        `Fallback token validation for ${token.substring(0, 5)}...: ${isValid ? "valid" : "invalid"}`,
      );
      console.log(
        `Token prefix: ${encodedPrefix}, Expected: ${expectedPrefix}`,
      );

      return isValid;
    }
  } catch (error) {
    console.error("Error during token validation:", error);
  }

  console.log(`Token format invalid: ${token.substring(0, 5)}...`);
  return false;
}

// Generate a session token
function generateSessionToken(userId: string): string {
  if (!userId) {
    console.error("Cannot generate token for empty userId");
    throw new Error("Invalid user ID for token generation");
  }

  try {
    // Create a more robust token that encodes user information
    // This allows us to validate tokens even if the server restarts
    // Use the full userId to ensure uniqueness
    const encodedUserId = Buffer.from(userId)
      .toString("base64")
      .replace(/=/g, "");
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    const token = `${encodedUserId}_${timestamp}_${randomPart}`;

    // Store the session token in memory for this server instance
    sessionTokens.set(token, userId);
    console.log(
      `Generated new session token: ${token.substring(0, 5)}... for user: ${userId.substring(0, 5)}...`,
    );
    console.log(`Current active sessions: ${sessionTokens.size}`);

    return token;
  } catch (error) {
    console.error("Error generating session token:", error);
    throw new Error("Failed to generate session token");
  }
}

// Helper function to get current user ID from token or database
async function getCurrentUserId(sessionToken?: string) {
  try {
    console.log(
      `getCurrentUserId called with token: ${sessionToken ? sessionToken.substring(0, 5) + "..." : "undefined"}`,
    );

    // If no session token is provided, use the current user ID (for backward compatibility)
    if (!sessionToken) {
      console.log(
        `No session token provided, using currentUserId: ${currentUserId || "null"}`,
      );
      return currentUserId;
    }

    // If a session token is provided, first check in-memory map
    if (sessionTokens.has(sessionToken)) {
      // Log successful token validation for debugging
      const userId = sessionTokens.get(sessionToken);
      console.log(
        `Session token validated successfully from memory: ${sessionToken.substring(0, 5)}... -> userId: ${userId?.substring(0, 5) || "null"}...`,
      );
      return userId || null;
    }

    // If token not found in memory map, try to decode user ID from the token
    // This helps with persistent authentication across server restarts
    try {
      const parts = sessionToken.split("_");
      if (parts.length > 1) {
        // In our new token format, the first part is the full encoded userId
        const encodedUserId = parts[0];

        try {
          // Check if encodedUserId exists and is not empty before decoding
          if (!encodedUserId) {
            console.error(
              "Encoded userId is empty or undefined, cannot decode",
            );
            throw new Error("Invalid token format: empty userId");
          }

          // Try to decode the userId directly from the token
          const decodedUserId = Buffer.from(encodedUserId, "base64").toString();
          console.log(
            `Attempting to restore session with decoded userId: ${decodedUserId.substring(0, 5)}...`,
          );

          // Verify this user exists in the database
          const user = await db.user.findUnique({
            where: { id: decodedUserId },
          });

          if (user) {
            // If found, store in the session map for future use
            sessionTokens.set(sessionToken, user.id);
            console.log(
              `Restored session from token: ${sessionToken.substring(0, 5)}... -> userId: ${user.id.substring(0, 5)}...`,
            );
            return user.id;
          } else {
            console.log(
              `No user found with decoded ID: ${decodedUserId.substring(0, 5)}...`,
            );
          }
        } catch (decodeError) {
          console.error("Error decoding userId from token:", decodeError);

          // Fallback to the old token format approach
          console.log("Falling back to legacy token validation...");
          const encodedPrefix = parts[0];

          // Find users that match this token prefix
          const users = await db.user.findMany({
            take: 20, // Increased limit to improve chances of finding the user
          });

          console.log(`Checking against ${users.length} users in database`);

          // Try to find a user whose ID prefix matches the token prefix
          for (const user of users) {
            if (validateSessionToken(sessionToken, user.id)) {
              // If found, store in the session map for future use
              sessionTokens.set(sessionToken, user.id);
              console.log(
                `Restored session using legacy validation: ${sessionToken.substring(0, 5)}... -> userId: ${user.id.substring(0, 5)}...`,
              );
              return user.id;
            }
          }

          console.log("Legacy token validation failed for all users");
        }
      } else {
        console.log(
          `Invalid token format (missing parts): ${sessionToken.substring(0, 5)}...`,
        );
      }
    } catch (tokenError) {
      console.error("Error processing token format:", tokenError);
    }

    // Log when token validation fails
    console.log(
      `Session token validation failed: ${sessionToken.substring(0, 5)}... (token not found in session map)`,
    );
    // Check if there are any tokens in the map for debugging
    if (sessionTokens.size === 0) {
      console.log("No active sessions in memory. Session map is empty.");
    } else {
      console.log(`${sessionTokens.size} active sessions in memory.`);
    }

    // If currentUserId is set, use it as fallback
    if (currentUserId) {
      console.log(
        `Using fallback currentUserId: ${currentUserId.substring(0, 5)}...`,
      );
      // Generate a new token for this user instead of reusing the invalid one
      const newToken = generateSessionToken(currentUserId);
      console.log(
        `Generated new token ${newToken.substring(0, 5)}... to replace invalid token`,
      );
      return currentUserId;
    }

    return null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

// Register a new medical user
export async function registerMedicalUser({
  name,
  birthDate,
  gender,
  university,
  graduationYear,
  specialization,
  email,
}: {
  name: string;
  birthDate: string;
  gender: string;
  university: string;
  graduationYear: string;
  specialization: string;
  email: string;
}) {
  try {
    console.log(`Registering/logging in user with email: ${email}`);

    // Check if user already exists with this email
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // If user exists, set as current user
      userId = existingUser.id;
      currentUserId = userId;
      console.log(`Existing user found: ${userId.substring(0, 5)}...`);

      // Update user data if provided
      await db.user.update({
        where: { id: userId },
        data: {
          name,
          birthDate,
          gender,
          university,
          graduationYear,
          specialization,
        },
      });
      console.log(`Updated existing user data: ${userId.substring(0, 5)}...`);
    } else {
      // Create new user
      const newUser = await db.user.create({
        data: {
          name,
          birthDate,
          gender,
          university,
          graduationYear,
          specialization,
          email,
        },
      });

      // Set current user ID
      userId = newUser.id;
      currentUserId = userId;
      isNewUser = true;
      console.log(`New user created: ${userId.substring(0, 5)}...`);
    }

    // Clear existing tokens for this user to prevent duplicates
    // Find and remove any existing tokens for this user
    let tokensRemoved = 0;
    for (const [token, id] of sessionTokens.entries()) {
      if (id === userId) {
        console.log(
          `Removing old session token for user: ${userId.substring(0, 5)}...`,
        );
        sessionTokens.delete(token);
        tokensRemoved++;
      }
    }
    console.log(
      `Removed ${tokensRemoved} old tokens for user ${userId.substring(0, 5)}...`,
    );

    // Generate a session token
    const sessionToken = generateSessionToken(userId);
    console.log(
      `New session token generated successfully: ${sessionToken.substring(0, 5)}...`,
    );

    return {
      success: true,
      userId,
      sessionToken,
      userData: {
        name,
        birthDate,
        gender,
        university,
        graduationYear,
        specialization,
        email,
      },
      message: isNewUser ? "登録が完了しました" : "ログインしました",
    };
  } catch (error) {
    console.error("Error registering medical user:", error);
    return {
      success: false,
      message: `登録中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Check if user is authenticated
export async function checkAuthentication(input?: { sessionToken?: string }) {
  console.log(
    `checkAuthentication called with sessionToken: ${input?.sessionToken?.substring(0, 5) || "undefined"}...`,
  );

  let userId = await getCurrentUserId(input?.sessionToken);

  // If session token authentication fails, try fallback to currentUserId
  if (!userId && currentUserId) {
    console.log(
      `Using fallback authentication with currentUserId: ${currentUserId.substring(0, 5)}...`,
    );
    userId = currentUserId;

    // If we have a valid currentUserId but the session token is invalid,
    // regenerate a new session token for this user
    if (input?.sessionToken) {
      const newToken = generateSessionToken(currentUserId);
      console.log(
        `Regenerated session token: ${newToken.substring(0, 5)}... for user: ${currentUserId.substring(0, 5)}...`,
      );
    }
  }

  return {
    isAuthenticated: !!userId,
    userId,
  };
}


// Type for PubMed citation
type PubMedCitation = {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  url: string;
};

// Type for web search result
type WebSearchResult = {
  title: string;
  snippet: string;
  url: string;
  source: string;
};

// Get user profile information
export async function getUserProfile(input?: { sessionToken?: string }) {
  let userId = await getCurrentUserId(input?.sessionToken);
  console.log(
    `getUserProfile called with sessionToken: ${input?.sessionToken?.substring(0, 5) || "undefined"}... -> userId: ${userId?.substring(0, 5) || "null"}`,
  );

  if (!userId) {
    // Try fallback to currentUserId if session token authentication fails
    if (currentUserId) {
      console.log(
        `Using fallback authentication with currentUserId: ${currentUserId.substring(0, 5)}...`,
      );
      userId = currentUserId;
    } else {
      throw new Error("認証が必要です。医療従事者登録を行ってください。");
    }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("ユーザープロフィールが見つかりません。");
  }

  return {
    name: user.name,
    birthDate: user.birthDate,
    gender: user.gender,
    university: user.university,
    graduationYear: user.graduationYear,
    specialization: user.specialization,
    email: user.email,
  };
}

// Search the web for medical information
async function searchWeb({
  query,
  maxResults = 3,
}: {
  query: string;
  maxResults?: number;
}): Promise<WebSearchResult[]> {
  try {
    // Add retry logic for web search
    let attempts = 0;
    const maxAttempts = 2;
    let lastError;

    while (attempts < maxAttempts) {
      try {
        const result = await requestMultimodalModel({
          system:
            "You are a medical research assistant that searches the web for up-to-date medical information. Search ONLY for PDF files from OFFICIAL MEDICAL ASSOCIATIONS and extract the most relevant information related to the query. Focus exclusively on PDFs published by recognized medical societies, physician organizations, and health authorities. Limit your search results exclusively to PDF documents.",
          messages: [
            {
              role: "user",
              content: `Search the web for current, evidence-based information about: ${query}\n\nFocus EXCLUSIVELY on PDF files from OFFICIAL MEDICAL ASSOCIATIONS, societies, and physician organizations. Use search operators like 'filetype:pdf' AND include terms like 'medical association', 'medical society', 'physician organization', 'guideline', 'position statement', or 'consensus statement' in your search. Example domains to prioritize: .org domains of medical societies, physician colleges, and health authorities. Provide exactly ${maxResults} most relevant sources.`,
            },
          ],
          returnType: z.object({
            webResults: z.array(
              z.object({
                title: z.string(),
                snippet: z.string(),
                url: z.string(),
                source: z.string(),
              }),
            ),
          }),
        });

        return result.webResults;
      } catch (error) {
        lastError = error;
        console.error(`Web search attempt ${attempts + 1} failed:`, error);
        attempts++;
        // Wait briefly before retrying
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    console.error(
      `All web search attempts failed after ${maxAttempts} tries. Last error:`,
      lastError,
    );
    return [];
  } catch (error) {
    console.error("Error in searchWeb outer try/catch:", error);
    return [];
  }
}

// 日本語クエリを英語に翻訳する関数
async function translateQueryToEnglish(query: string): Promise<string> {
  try {
    // 既に英語の場合は翻訳せずにそのまま返す
    // 簡易的な英語判定（アルファベットと記号のみで構成されているか）
    if (/^[a-zA-Z0-9\s.,;:?!()\-+]*$/.test(query)) {
      console.log("Query is already in English, skipping translation");
      return query;
    }

    console.log(`Translating query to English: "${query}"`);
    const result = await requestMultimodalModel({
      system:
        "あなたは医学翻訳の専門家です。与えられた日本語の医学的な質問やキーワードを、PubMed検索に最適な英語に翻訳してください。医学用語は適切な専門用語を使用し、簡潔かつ検索に適した形式にしてください。",
      messages: [
        {
          role: "user",
          content: `以下の医学的な質問またはキーワードを、PubMed検索用の英語に翻訳してください。翻訳のみを返し、説明は不要です：\n\n${query}`,
        },
      ],
      returnType: z.object({
        translatedQuery: z.string(),
      }),
    });

    console.log(`Translated query: "${result.translatedQuery}"`);
    return result.translatedQuery;
  } catch (error) {
    console.error("Error translating query to English:", error);
    // 翻訳に失敗した場合は元のクエリを返す
    return query;
  }
}

// Search PubMed API using NCBI E-utilities
export async function searchPubMed({
  query,
  maxResults = 5,
}: {
  query: string;
  maxResults?: number;
}) {
  try {
    // クエリを英語に翻訳
    const translatedQuery = await translateQueryToEnglish(query);
    // Step 1: Search for IDs using ESearch with translated query
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      translatedQuery,
    )}&retmode=json&retmax=${maxResults}&tool=medevidence&email=app@example.com`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MedEvidence/1.0 (Medical Evidence App; app@example.com)",
      },
    });

    if (!searchResponse.ok) {
      console.error(
        `PubMed search failed with status: ${searchResponse.status}`,
      );
      return { citations: [] };
    }

    // Check content type to ensure we're getting JSON
    const searchContentType = searchResponse.headers.get("content-type");
    if (!searchContentType || !searchContentType.includes("application/json")) {
      console.error(`PubMed returned non-JSON content: ${searchContentType}`);
      return { citations: [] };
    }

    const searchData = await searchResponse.json();
    const pmids = searchData.esearchresult?.idlist;

    if (!pmids || pmids.length === 0) {
      return { citations: [], translatedQuery: translatedQuery ?? query };
    }

    // Step 2: Fetch details using EFetch
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(
      ",",
    )}&retmode=xml&tool=medevidence&email=app@example.com`;

    const fetchResponse = await fetch(fetchUrl, {
      headers: {
        Accept: "text/xml",
        "User-Agent": "MedEvidence/1.0 (Medical Evidence App; app@example.com)",
      },
    });

    if (!fetchResponse.ok) {
      console.error(`PubMed fetch failed with status: ${fetchResponse.status}`);
      return { citations: [] };
    }

    // Check content type to ensure we're getting XML
    const fetchContentType = fetchResponse.headers.get("content-type");
    if (!fetchContentType || !fetchContentType.includes("text/xml")) {
      console.error(`PubMed returned non-XML content: ${fetchContentType}`);
      return { citations: [] };
    }

    const xmlText = await fetchResponse.text();

    // Step 3: Parse XML and extract data using LLM
    const citations = await extractCitationsFromXml({ xmlText, pmids });

    return { citations, translatedQuery: translatedQuery ?? query };
  } catch (error) {
    console.error("Error searching PubMed:", error);
    // Return empty citations instead of throwing
    return { citations: [], translatedQuery: query };
  }
}

// Extract citation information from PubMed XML using LLM
async function extractCitationsFromXml({
  xmlText,
  pmids,
}: {
  xmlText: string;
  pmids: string[];
}): Promise<PubMedCitation[]> {
  try {
    const result = await requestMultimodalModel({
      system:
        "You are a medical research assistant that extracts structured information from PubMed XML data. Extract only the information present in the XML, without adding any information not present in the source.",
      messages: [
        {
          role: "user",
          content: `Extract the following information for each article in this PubMed XML data: PMID, title, authors (formatted as 'Last FM, Last FM'), journal name, publication year, and abstract. The PMIDs to extract are: ${pmids.join(", ")}. 
          
Here's the XML:
${xmlText.substring(0, 100000)}`, // Limit size to avoid token limits
        },
      ],
      returnType: z.object({
        citations: z.array(
          z.object({
            pmid: z.string(),
            title: z.string(),
            authors: z.string(),
            journal: z.string(),
            year: z.string(),
            abstract: z.string(),
          }),
        ),
      }),
    });
    // Add URL to each citation
    return result.citations.map((citation) => ({
      ...citation,
      url: `https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`,
    }));
  } catch (error) {
    console.error("Error extracting citations:", error);
    // Return empty array instead of throwing
    return [];
  }
}

// Extract content from user-provided PDFs
async function extractContentFromPdf(pdfBase64: string): Promise<string> {
  try {
    // ログを追加してPDFデータを確認
    console.log(
      `PDF data received, length: ${pdfBase64.length}, starts with: ${pdfBase64.substring(0, 100)}...`,
    );

    // PDFデータの形式を確認
    if (!pdfBase64.startsWith("data:application/pdf;base64,")) {
      console.error(
        "Invalid PDF data format. Expected data URI with application/pdf MIME type",
      );
      return JSON.stringify({
        content:
          "PDFデータの形式が無効です。正しいPDFファイルを提供してください。",
        title: "形式エラー",
        source: "ユーザー提供のPDF",
      });
    }

    // データURIからBase64部分だけを抽出
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    // Base64データが空でないか確認
    if (!base64Data || base64Data.trim() === "") {
      console.error("Empty PDF data after extracting base64 content");
      return JSON.stringify({
        content: "PDFデータが空です。有効なPDFファイルを提供してください。",
        title: "データエラー",
        source: "ユーザー提供のPDF",
      });
    }

    // PDFのBase64データが有効か確認（簡易チェック）
    try {
      // Base64デコードを試みる（一部だけでOK）
      const testDecode = atob(base64Data.substring(0, 100));
      if (!testDecode || testDecode.length === 0) {
        throw new Error("Base64 decoding failed");
      }

      // PDF形式の最初の数バイトをチェック（%PDF-で始まるはず）
      if (!testDecode.startsWith("%PDF-")) {
        console.error("Invalid PDF header signature");
        return JSON.stringify({
          content:
            "PDFファイルのシグネチャが無効です。正しいPDFファイルを提供してください。",
          title: "PDFフォーマットエラー",
          source: "ユーザー提供のPDF",
        });
      }
    } catch (decodeError) {
      console.error("Invalid base64 data in PDF:", decodeError);
      return JSON.stringify({
        content:
          "PDFデータのエンコーディングが無効です。正しいPDFファイルを提供してください。",
        title: "エンコーディングエラー",
        source: "ユーザー提供のPDF",
      });
    }

    // 簡易的なPDFプレバリデーション
    try {
      // PDFの一般的な特徴をチェック
      const pdfSample = atob(
        base64Data.substring(0, Math.min(5000, base64Data.length)),
      );

      // 一般的なPDFファイル構造の特徴を探す
      if (
        !pdfSample.includes("/Pages") &&
        !pdfSample.includes("/Type") &&
        !pdfSample.includes("/Contents")
      ) {
        console.error(
          "PDF validation failed: Missing common PDF structure markers",
        );
        return JSON.stringify({
          content:
            "PDFファイルの構造が認識できません。標準的なPDFファイルを提供してください。",
          title: "PDF構造エラー",
          source: "ユーザー提供のPDF",
        });
      }
    } catch (validationError) {
      console.error("PDF validation error:", validationError);
      // バリデーションエラーでも続行（完全なチェックではないため）
    }

    // Use LLM to extract text content from PDF
    console.log("Starting PDF extraction with multimodal model...");
    const result = await requestMultimodalModel({
      system:
        "You are a PDF text extraction assistant specialized in medical documents. Your task is to extract all relevant medical information from the provided PDF, focusing on clinical data, treatment guidelines, and research findings. Be thorough and accurate. If you cannot process the PDF or if no valid PDF is provided, clearly state that fact.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all medical information from this PDF, including any guidelines, clinical criteria, or treatment protocols. If you cannot process the PDF or if no valid PDF content is detected, clearly indicate that the PDF extraction failed.",
            },
            {
              type: "pdf_url",
              pdf_url: {
                url: pdfBase64,
              },
            },
          ],
        },
      ],
      returnType: z.object({
        content: z.string(),
        title: z.string().optional(),
        authors: z.string().optional(),
        source: z.string().optional(),
        year: z.string().optional(),
      }),
    });

    // PDFの内容が正常に抽出されたか確認
    if (
      result.content.includes("No PDF document") ||
      result.content.includes("cannot process") ||
      result.content.includes("could not be processed") ||
      result.content.includes("unable to extract") ||
      result.content.includes("extraction failed") ||
      result.content.includes("no valid PDF") ||
      result.content.includes("PDF was not provided")
    ) {
      console.error(
        "PDF extraction failed with error message:",
        result.content,
      );
      return JSON.stringify({
        content:
          "PDFからの内容抽出に失敗しました。別のPDFファイルを試すか、テキスト形式で質問してください。エラー内容: " +
          result.content.substring(0, 100),
        title: "PDF抽出エラー",
        source: "ユーザー提供のPDF",
      });
    }

    // 内容が極端に短い場合も失敗とみなす
    if (result.content.length < 50) {
      console.error(
        "PDF extraction returned suspiciously short content:",
        result.content,
      );
      return JSON.stringify({
        content:
          "PDFから十分な内容を抽出できませんでした。別のPDFファイルを試すか、テキスト形式で質問してください。",
        title: "内容抽出エラー",
        source: "ユーザー提供のPDF",
      });
    }

    console.log(
      "PDF extraction successful, extracted content length:",
      result.content.length,
    );
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error extracting content from PDF:", error);
    return JSON.stringify({
      content:
        "PDFからの内容抽出に失敗しました。" +
        (error instanceof Error ? ` エラー: ${error.message}` : ""),
      title: "抽出エラー",
      source: "ユーザー提供のPDF",
    });
  }
}

// Extract content from user-provided URLs
async function extractContentFromUrl(url: string): Promise<string> {
  try {
    // Use LLM to extract content from URL
    const result = await requestMultimodalModel({
      system:
        "You are a web content extraction assistant. Extract all relevant medical information from the provided URL.",
      messages: [
        {
          role: "user",
          content: `Extract all medical information from this URL: ${url}`,
        },
      ],
      returnType: z.object({
        content: z.string(),
        title: z.string(),
        source: z.string(),
        url: z.string(),
      }),
    });

    return JSON.stringify(result);
  } catch (error) {
    console.error("Error extracting content from URL:", error);
    return JSON.stringify({
      content: "URLからの内容抽出に失敗しました。",
      title: "抽出エラー",
      source: "ユーザー提供のURL",
      url: url,
    });
  }
}

// Process a medical query using PubMed evidence and web search
// お気に入り状態を切り替える関数
export async function toggleFavorite({
  id,
  sessionToken,
}: {
  id: string;
  sessionToken?: string;
}) {
  if (!id) {
    throw new Error("Invalid search query ID");
  }

  // ユーザー認証
  const userId = await getCurrentUserId(sessionToken);
  if (!userId) {
    throw new Error("認証が必要です。医療従事者登録を行ってください。");
  }

  // 検索クエリを取得
  const searchQuery = await db.searchQuery.findUnique({
    where: { id },
    select: { id: true, isFavorite: true, userId: true },
  });

  if (!searchQuery) {
    throw new Error("Search query not found");
  }

  // 他のユーザーの検索クエリをお気に入りにできないようにする
  if (searchQuery.userId !== userId) {
    throw new Error(
      "他のユーザーの検索クエリをお気に入りにすることはできません",
    );
  }

  // お気に入り状態を反転
  const updatedQuery = await db.searchQuery.update({
    where: { id },
    data: { isFavorite: !searchQuery.isFavorite },
    select: { id: true, isFavorite: true },
  });

  return updatedQuery;
}

// 検索結果に対するフィードバックを提出する関数
export async function submitFeedback({
  id,
  feedback,
  comment,
  sessionToken,
}: {
  id: string;
  feedback: "good" | "bad";
  comment?: string;
  sessionToken?: string;
}) {
  if (!id) {
    throw new Error("Invalid search query ID");
  }

  if (feedback !== "good" && feedback !== "bad") {
    throw new Error("Feedback must be either 'good' or 'bad'");
  }

  // ユーザー認証
  const userId = await getCurrentUserId(sessionToken);
  if (!userId) {
    throw new Error("認証が必要です。医療従事者登録を行ってください。");
  }

  // 検索クエリを取得
  const searchQuery = await db.searchQuery.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!searchQuery) {
    throw new Error("Search query not found");
  }

  // 他のユーザーの検索クエリにフィードバックできないようにする
  if (searchQuery.userId !== userId) {
    throw new Error(
      "他のユーザーの検索クエリにフィードバックすることはできません",
    );
  }

  // フィードバックを保存
  const updatedQuery = await db.searchQuery.update({
    where: { id },
    data: {
      feedback,
      feedbackComment: comment || null,
      feedbackSubmittedAt: new Date(),
    },
    select: {
      id: true,
      feedback: true,
      feedbackComment: true,
      feedbackSubmittedAt: true,
    },
  });

  return updatedQuery;
}

export async function processMedicalQuery({
  query,
  maxResults = 5,
  sessionToken,
  userEvidence = [], // Array of user-provided PDFs (base64) or URLs (機能は削除されましたが、後方互換性のために残しています)
  useOnlyUserEvidence = false, // Whether to use only user-provided evidence (機能は削除されましたが、後方互換性のために残しています)
  usePubMedOnly = false, // Whether to use only PubMed and exclude web search
  responseLanguage = "ja", // Language for the response: "ja" (Japanese) or "en" (English)
  previousQueryId = null, // Previous query ID for follow-up questions
}: {
  query: string;
  maxResults?: number;
  sessionToken?: string;
  userEvidence?: Array<{ type: "pdf" | "url"; content: string }>;
  useOnlyUserEvidence?: boolean;
  usePubMedOnly?: boolean;
  responseLanguage?: "ja" | "en";
  previousQueryId?: string | null;
}) {
  try {
    console.log(`Processing medical query: "${query}" with maxResults=${maxResults}`);
    
    // Create a temporary user ID if none is provided
    let userId = await getCurrentUserId(sessionToken);
    
    // If no authenticated user, create a temporary one for search functionality
    if (!userId) {
      console.log("No authenticated user found, creating temporary user for search");
      // Create a temporary user for search
      try {
        const tempUser = await db.user.create({
          data: {
            name: "一時ユーザー",
            email: `temp-${Date.now()}@example.com`,
          },
        });
        userId = tempUser.id;
        currentUserId = userId;
        console.log(`Created temporary user with ID: ${userId}`);
      } catch (error) {
        console.error("Error creating temporary user:", error);
        // If we can't create a temp user, use a fallback ID
        userId = "temp-user-id";
      }
    }

    console.log(`Creating task for user ${userId}, query: "${query}"`);
    
    // Generate a taskId for both queueTask and the placeholder record
    const { nanoid } = await import('nanoid');
    const taskId = nanoid();

    // Create a placeholder record for tracking
    try {
      await db.searchQuery.create({
        data: {
          id: taskId,
          query,
          answer: "検索処理中...",
          citations: "[]",
          webResults: "[]",
          maxResults,
          userId,
          usePubMedOnly,
          responseLanguage
        }
      });
      console.log(`Created initial search record with ID: ${taskId}`);
    } catch (createError) {
      console.error(`Failed to create initial record with task ID: ${createError}`);
      // If we can't create with the task ID, log the error but continue
      // The task will still run and will create its own record when complete
      console.log("Continuing with task execution despite initial record creation failure");
    }

    // Create a task for processing the query
    await queueTask(async () => {
      try {
        console.log(`Task started for query: "${query}"`);
        // Use the passed in taskId for all updates
        // Process the query and pass the task ID to ensure results are saved with this ID
        const result = await processMedicalQueryWithUserId({
          query,
          maxResults: Math.min(5, maxResults),
          userId: userId as string,
          userEvidence: [], // 独自のエビデンス機能は削除されたため空の配列を渡す
          useOnlyUserEvidence: false, // 独自のエビデンス機能は削除されたためfalseを渡す
          usePubMedOnly,
          responseLanguage,
          previousQueryId,
          searchQueryId: taskId // Use the generated taskId
        });
        // Log the result ID for debugging
        const resultId = result.id;
        console.log(`Task completed successfully with result ID: ${resultId}`);
      } catch (taskError) {
        console.error(`Task error for query "${query}":`, taskError);
        // Get the task ID from the environment variable
        const taskId = process.env.ADAPTIVE_TASK_ID;
        
        // Create a record with error information
        try {
          if (taskId) {
            // Try to update existing record first
            try {
              await db.searchQuery.update({
                where: { id: taskId },
                data: {
                  answer: `検索処理中にエラーが発生しました: ${taskError instanceof Error ? taskError.message : String(taskError)}`,
                }
              });
              console.log(`Updated existing record ${taskId} with error information`);
            } catch (updateError) {
              // If update fails, create a new record
              await db.searchQuery.create({
                data: {
                  id: taskId,
                  query,
                  answer: `検索処理中にエラーが発生しました: ${taskError instanceof Error ? taskError.message : String(taskError)}`,
                  citations: "[]",
                  webResults: "[]",
                  maxResults,
                  userId,
                  usePubMedOnly,
                  responseLanguage
                }
              });
              console.log(`Created error record with task ID: ${taskId}`);
            }
          } else {
            // Fallback if no task ID is available
            const errorRecord = await db.searchQuery.create({
              data: {
                query,
                answer: `検索処理中にエラーが発生しました: ${taskError instanceof Error ? taskError.message : String(taskError)}`,
                citations: "[]",
                webResults: "[]",
                maxResults,
                userId,
                usePubMedOnly,
                responseLanguage
              }
            });
            console.log(`Created error record with generated ID: ${errorRecord.id}`);
          }
        } catch (createError) {
          console.error("Failed to create/update error record:", createError);
        }
        
        // Re-throw the error to ensure the task is marked as failed
        throw taskError;
      }
    });

    // Report the queued taskId to the frontend
    console.log(`Task queued with ID: ${taskId}`);
    return { taskId };
  } catch (error) {
    console.error("Error in processMedicalQuery:", error);
    throw error;
  }
}

// Add function to get the status of a medical query task
export async function getMedicalQueryStatus({ taskId }: { taskId: string }) {
  try {
    console.log(`[getTaskStatus] API called with args:`, taskId);
    const status = await getTaskStatus(taskId);
    console.log(`[getTaskStatus] API returned:`, status);
    return status;
  } catch (error) {
    console.error("Error getting medical query task status:", error);
    throw error;
  }
}

// Add function to get the results of a completed medical query task
export async function getMedicalQueryResults({ taskId }: { taskId: string }) {
  try {
    const task = await getTaskStatus(taskId);
    console.log(`Getting results for task ${taskId}, status: ${task.status}`);

    if (task.status !== "COMPLETED") {
      throw new Error(
        `Task is not completed yet. Current status: ${task.status}`,
      );
    }

    // The task.data?.resultId approach is not reliable as task.data might be undefined
    // So we'll directly look for the search query with the task ID

    // If the task is completed, fetch the result from the SearchQuery table using the task ID
    const searchQuery = await db.searchQuery.findUnique({
      where: { id: task.id },
    });
    console.log(`[prismaDbClient] Query SearchQuery.findUnique:`, searchQuery);
    
    if (!searchQuery) {
      console.error(`No record found with task ID ${task.id}, searching for records with matching query`);
      
      // If no record is found with the task ID, try to find a record with a matching query
      // This is a fallback mechanism in case the task ID was not properly saved
      const records = await db.searchQuery.findMany({
        where: {
          answer: { not: "検索処理中..." }, // Only find records with actual answers
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 10) } // Only look at records created in the last 10 minutes
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      console.log(`Found ${records.length} recent records with actual answers`);
      
      if (records.length > 0) {
        // Use the most recent record as a fallback
        const mostRecent = records[0];
        if (!mostRecent) {
          throw new Error("Task completed but fallback record is undefined");
        }
        console.log(`Using most recent record with ID ${mostRecent.id} as fallback`);
        
        // Try to create a record with the task ID to ensure future lookups work correctly
        try {
          await db.searchQuery.create({
            data: {
              id: task.id,
              query: mostRecent.query,
              translatedQuery: mostRecent.translatedQuery,
              answer: mostRecent.answer,
              citations: mostRecent.citations,
              webResults: mostRecent.webResults || "[]",
              userEvidence: mostRecent.userEvidence || "[]",
              useOnlyUserEvidence: mostRecent.useOnlyUserEvidence || false,
              usePubMedOnly: mostRecent.usePubMedOnly || false,
              maxResults: mostRecent.maxResults,
              responseLanguage: mostRecent.responseLanguage,
              previousQueryId: mostRecent.previousQueryId,
              userId: mostRecent.userId
            }
          });
          console.log(`Created new record with task ID ${task.id} based on fallback record ${mostRecent.id}`);
        } catch (createError) {
          console.error(`Failed to create record with task ID ${task.id}:`, createError);
          // Continue even if creation fails - we'll return the fallback record
        }
        
        return formatSearchQueryResult(mostRecent);
      }
      
      throw new Error("Task completed but no result data found");
    }
    
    // Check if this record still has the "検索処理中..." placeholder
    if (searchQuery.answer === "検索処理中...") {
      console.error(`Record found with task ID ${task.id}, but it still has the placeholder answer`);
      
      // Look for another record that might have the actual results
      const completedRecords = await db.searchQuery.findMany({
        where: {
          answer: { not: "検索処理中..." }, // Only find records with actual answers
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 10) } // Only look at records created in the last 10 minutes
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      console.log(`[prismaDbClient] Query SearchQuery.findMany:`, completedRecords);
      
      if (completedRecords.length > 0) {
        // Use the most recent record with actual content
        const completedRecord = completedRecords[0];
        if (!completedRecord) {
          console.error("Completed records found but first record is undefined");
          // Fall back to returning the placeholder record
          return formatSearchQueryResult(searchQuery);
        }
        console.log(`Using record with ID ${completedRecord.id} that has actual content`);
        
        // Update the original record with the content from the completed record
        try {
          const updatedRecord = await db.searchQuery.update({
            where: { id: task.id },
            data: {
              answer: completedRecord.answer,
              citations: completedRecord.citations,
              webResults: completedRecord.webResults,
              userEvidence: completedRecord.userEvidence,
              translatedQuery: completedRecord.translatedQuery
            }
          });
          console.log(`Updated original record ${task.id} with content from ${completedRecord.id}`);
          
          return formatSearchQueryResult(updatedRecord);
        } catch (updateError) {
          console.error(`Failed to update original record ${task.id}:`, updateError);
          // Fall back to returning the completed record directly
          return formatSearchQueryResult(completedRecord);
        }
      }
    }
    
    // Return the search query with proper formatting
    return formatSearchQueryResult(searchQuery);
  } catch (error) {
    console.error("Error getting medical query results:", error);
    throw error;
  }
}

// Helper function to format search query results consistently
function formatSearchQueryResult(searchQuery: any) {
  if (!searchQuery) {
    throw new Error("Cannot format undefined search query");
  }
  
  return {
    id: searchQuery.id,
    query: searchQuery.query,
    translatedQuery: searchQuery.translatedQuery || undefined,
    answer: searchQuery.answer,
    citations: JSON.parse(searchQuery.citations) || [],
    webResults: JSON.parse(searchQuery.webResults || "[]") || [],
    userEvidence: JSON.parse(searchQuery.userEvidence || "[]") || [],
    useOnlyUserEvidence: searchQuery.useOnlyUserEvidence || false,
    usePubMedOnly: searchQuery.usePubMedOnly || false,
    maxResults: searchQuery.maxResults,
    responseLanguage: searchQuery.responseLanguage,
    previousQueryId: searchQuery.previousQueryId,
    createdAt: searchQuery.createdAt,
    isFavorite: searchQuery.isFavorite || false,
    userName: searchQuery.userId || undefined,
    userId: searchQuery.userId,
  };
}

// Helper function to process medical query with a known user ID
async function processMedicalQueryWithUserId({
  query,
  maxResults = 5,
  userId,
  userEvidence = [],
  useOnlyUserEvidence = false,
  usePubMedOnly = false,
  responseLanguage = "ja",
  previousQueryId = null,
  searchQueryId = null, // ID of an existing search query record to update
}: {
  query: string;
  maxResults?: number;
  userId: string;
  userEvidence?: Array<{ type: "pdf" | "url"; content: string }>;
  useOnlyUserEvidence?: boolean;
  usePubMedOnly?: boolean;
  responseLanguage?: "ja" | "en";
  previousQueryId?: string | null;
  searchQueryId?: string | null;
}) {
  try {
    // Ensure maxResults is never more than 5
    maxResults = Math.min(5, maxResults);
    // Calculate the split between PubMed and web search
    let pubmedMax = maxResults;
    let webMax = 0;
    if (!usePubMedOnly) {
      pubmedMax = Math.ceil(maxResults / 2);
      webMax = maxResults - pubmedMax;
    }
    console.log(
      `Processing medical query for user ${userId.substring(0, 5)}... with maxResults: ${maxResults} (PubMed: ${pubmedMax}, Web: ${webMax})`,
    );

    // Process user-provided evidence
    const userProvidedEvidence: Array<{
      content: string;
      title?: string;
      source: string;
      url?: string;
      type: "user_pdf" | "user_url";
    }> = [];

    // Process each piece of user evidence
    if (userEvidence && userEvidence.length > 0) {
      console.log(`Processing ${userEvidence.length} pieces of user evidence`);
      for (const evidence of userEvidence) {
        if (evidence.type === "pdf") {
          console.log(
            `Processing PDF evidence, content length: ${evidence.content.length}`,
          );
          const extractedContent = await extractContentFromPdf(
            evidence.content,
          );
          try {
            const parsed = JSON.parse(extractedContent) as {
              content: string;
              title?: string;
              source?: string;
              authors?: string;
              year?: string;
            };
            // 抽出されたコンテンツが「No PDF document」などのエラーメッセージを含む場合は処理をスキップ
            if (
              parsed.content.includes("No PDF document has been provided") ||
              parsed.content.includes("PDFからの内容抽出に失敗")
            ) {
              console.error(
                "PDF extraction failed with error message:",
                parsed.content,
              );
              userProvidedEvidence.push({
                content:
                  "PDFの解析に失敗しました。別のPDFファイルを試すか、テキスト形式で質問してください。",
                title: "PDFエラー",
                source: "ユーザー提供のPDF",
                type: "user_pdf",
              });
            } else {
              console.log(
                "PDF extraction successful, content length:",
                parsed.content.length,
              );
              userProvidedEvidence.push({
                content: parsed.content,
                title: parsed.title || "医療文書",
                source: parsed.source || "ユーザー提供のPDF",
                type: "user_pdf",
              });
            }
          } catch (error) {
            console.error("Error parsing PDF content:", error);
            userProvidedEvidence.push({
              content:
                "PDFからの内容抽出に失敗しました。別のPDFファイルを試すか、テキスト形式で質問してください。",
              title: "抽出エラー",
              source: "ユーザー提供のPDF",
              type: "user_pdf",
            });
          }
        } else if (evidence.type === "url") {
          const extractedContent = await extractContentFromUrl(
            evidence.content,
          );
          try {
            const parsed = JSON.parse(extractedContent) as {
              content: string;
              title: string;
              source: string;
              url: string;
            };
            userProvidedEvidence.push({
              content: parsed.content,
              title: parsed.title,
              source: parsed.source || "ユーザー提供のURL",
              url: parsed.url,
              type: "user_url",
            });
          } catch (error) {
            console.error("Error parsing URL content:", error);
            userProvidedEvidence.push({
              content: "URLからの内容抽出に失敗しました。",
              title: "抽出エラー",
              source: "ユーザー提供のURL",
              url: evidence.content,
              type: "user_url",
            });
          }
        }
      }
    }

    // Only search external sources if not exclusively using user evidence
    let citations: PubMedCitation[] = [];
    let webResults: WebSearchResult[] = [];
    let translatedQuery: string = query; // デフォルトでは元のクエリを使用

    if (!useOnlyUserEvidence) {
      // Step 1: Search PubMed for relevant articles
      try {
        const pubMedResult = await searchPubMed({
          query,
          maxResults: pubmedMax,
        });
        citations = Array.isArray(pubMedResult.citations)
          ? pubMedResult.citations
          : [];
        translatedQuery = pubMedResult.translatedQuery || query; // 翻訳されたクエリを保存
      } catch (pubMedError) {
        console.error("Error searching PubMed:", pubMedError);
        // Continue with empty citations if PubMed search fails
      }

      // Step 2: Search the web for additional information only if not using PubMed only
      if (!usePubMedOnly && webMax > 0) {
        webResults = await searchWeb({ query, maxResults: webMax });
      }
    }

    if (
      citations.length === 0 &&
      webResults.length === 0 &&
      userProvidedEvidence.length === 0
    ) {
      // No results found from either source
      const searchQuery = await db.searchQuery.create({
        data: {
          query,
          answer:
            "お問い合わせに関連する医学的証拠は見つかりませんでした。質問の言い回しを変えるか、より具体的な医学用語を使用してみてください。",
          citations: "[]",
          webResults: "[]",
          maxResults,
          userId,
        },
      });

      if (!searchQuery || !searchQuery.id) {
        throw new Error("Failed to create search query record");
      }

      return {
        id: searchQuery.id,
        answer: searchQuery.answer,
        citations: [],
        webResults: [],
      };
    }

    // systemPromptをシンプルに
    const systemPrompt =
      "You are a medical research assistant that provides concise, evidence-based answers to medical questions. Your primary sources are PubMed abstracts which you must cite using PMID numbers. Supplement with official medical organization and university web sources if available. Search for up to " +
      maxResults +
      " evidence sources to provide a comprehensive answer.";

    // Step 3: Generate an evidence-based answer using LLM
    // Adjust system prompt based on response language
    let adjustedSystemPrompt = systemPrompt;
    if (responseLanguage === "en") {
      adjustedSystemPrompt +=
        "\n\nIMPORTANT: Please provide your response in English, regardless of the language of the query or sources.";
    } else {
      adjustedSystemPrompt +=
        "\n\nIMPORTANT: Please provide your response in Japanese, regardless of the language of the query or sources.";
    }

    const result = await requestMultimodalModel({
      system: adjustedSystemPrompt,
      messages: [
        {
          role: "user",
          content: `Question: ${query}
          
Provide a comprehensive, evidence-based answer using the following sources:

${
  userProvidedEvidence.length > 0
    ? "User-Provided Evidence:\n" +
      userProvidedEvidence
        .map((e, i) => {
          let content = `User Source ${i + 1}: ${e.source}\n`;
          if (e.title) content += `Title: ${e.title}\n`;
          if (e.url) content += `URL: ${e.url}\n`;
          content += `Content: ${e.content}\n\n`;
          return content;
        })
        .join("\n")
    : ""
}

${!useOnlyUserEvidence && citations.length > 0 ? "PubMed Abstracts:\n" + citations.map((c) => `PMID: ${c.pmid}\nTitle: ${c.title}\nAuthors: ${c.authors}\nJournal: ${c.journal} (${c.year})\nAbstract: ${c.abstract}\n\n`).join("\n") : useOnlyUserEvidence ? "" : "No PubMed abstracts found for this query."}

${!useOnlyUserEvidence && webResults.length > 0 ? "Web Sources:\n" + webResults.map((r, i) => `Web Source ${i + 1}: ${r.source}\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}\n\n`).join("\n") : useOnlyUserEvidence ? "" : "No web sources found for this query."}

Citation format instructions:
- For user-provided evidence, cite like this: [User Source 1]
- For PubMed information, cite the PMID for each claim you make using this format: [PMID: 12345678]
- For web information, cite the source number like this: [Web Source 1]

If there are contradictions between sources, acknowledge them and explain the different perspectives. If the evidence is limited, acknowledge this as well.

${useOnlyUserEvidence ? "\n\nIMPORTANT: Only use the user-provided evidence for your answer. Do not use your own knowledge or other sources." : ""}`,
        },
      ],
      returnType: z.object({
        answer: z.string(),
      }),
    });

    // Step 4: Save the query and result to the database with user association
    let searchQuery;
    
    // Get the task ID - this is the ID that the frontend will use to fetch results
    // When we're in a task, this will be the process.env.ADAPTIVE_TASK_ID
    // Otherwise, we'll use the searchQueryId parameter if provided
    const taskId = process.env.ADAPTIVE_TASK_ID || searchQueryId;
    
    console.log(`Saving search results with taskId: ${taskId || 'undefined'}, searchQueryId: ${searchQueryId || 'undefined'}`);
    
    try {
      // First, try to update the existing record using task ID
      if (taskId) {
        try {
          searchQuery = await db.searchQuery.update({
            where: { id: taskId },
            data: {
              query,
              translatedQuery, // 翻訳されたクエリを保存
              answer: result.answer,
              citations: JSON.stringify(citations),
              webResults: JSON.stringify(webResults),
              userEvidence: JSON.stringify(userProvidedEvidence),
              maxResults,
              userId,
              useOnlyUserEvidence,
              usePubMedOnly,
              responseLanguage,
              previousQueryId,
            },
          });
          console.log(`Successfully updated search query record with ID: ${taskId}`);
          return {
            id: searchQuery.id,
            answer: result.answer,
            citations,
            webResults,
            userEvidence: userProvidedEvidence,
          };
        } catch (updateError) {
          console.error(`Error updating record with ID ${taskId}:`, updateError);
          // Continue to next approach if update fails
        }
      }
      
      // If we have a searchQueryId but it's different from taskId, try updating with that
      if (searchQueryId && searchQueryId !== taskId) {
        try {
          searchQuery = await db.searchQuery.update({
            where: { id: searchQueryId },
            data: {
              query,
              translatedQuery,
              answer: result.answer,
              citations: JSON.stringify(citations),
              webResults: JSON.stringify(webResults),
              userEvidence: JSON.stringify(userProvidedEvidence),
              maxResults,
              userId,
              useOnlyUserEvidence,
              usePubMedOnly,
              responseLanguage,
              previousQueryId,
            },
          });
          console.log(`Successfully updated search query record with ID: ${searchQueryId}`);
          return {
            id: searchQuery.id,
            answer: result.answer,
            citations,
            webResults,
            userEvidence: userProvidedEvidence,
          };
        } catch (updateError) {
          console.error(`Error updating record with ID ${searchQueryId}:`, updateError);
          // Continue to next approach if update fails
        }
      }
      
      // If we have a taskId but couldn't update, try to create a record with that ID
      if (taskId) {
        try {
          // Try to create a record with the task ID
          searchQuery = await db.searchQuery.create({
            data: {
              id: taskId,
              query,
              translatedQuery,
              answer: result.answer,
              citations: JSON.stringify(citations),
              webResults: JSON.stringify(webResults),
              userEvidence: JSON.stringify(userProvidedEvidence),
              maxResults,
              userId,
              useOnlyUserEvidence,
              usePubMedOnly,
              responseLanguage,
              previousQueryId,
            },
          });
          console.log(`Created new search query record with task ID: ${taskId}`);
          return {
            id: searchQuery.id,
            answer: result.answer,
            citations,
            webResults,
            userEvidence: userProvidedEvidence,
          };
        } catch (createError) {
          console.error(`Error creating record with task ID ${taskId}:`, createError);
          // Continue to fallback approach
        }
      }
      
      // Last resort: create a new record with a generated ID
      searchQuery = await db.searchQuery.create({
        data: {
          query,
          translatedQuery,
          answer: result.answer,
          citations: JSON.stringify(citations),
          webResults: JSON.stringify(webResults),
          userEvidence: JSON.stringify(userProvidedEvidence),
          maxResults,
          userId,
          useOnlyUserEvidence,
          usePubMedOnly,
          responseLanguage,
          previousQueryId,
        },
      });
      console.log(`Created new search query record with generated ID: ${searchQuery.id}`);
    } catch (dbError) {
      console.error(`Critical error saving search query results:`, dbError);
      throw new Error(`Failed to save search results: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }

    return {
      id: searchQuery.id,
      answer: result.answer,
      citations,
      webResults,
      userEvidence: userProvidedEvidence,
    };
  } catch (error) {
    console.error("Error processing medical query:", error);
    throw new Error(
      `Failed to process query: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Get a specific search query by ID
export async function getSearchQuery({ id }: { id: string }) {
  if (!id) {
    throw new Error("Invalid search query ID");
  }

  const searchQuery = await db.searchQuery.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!searchQuery) {
    throw new Error("Search query not found");
  }

  return {
    id: searchQuery.id,
    query: searchQuery.query,
    translatedQuery: searchQuery.translatedQuery || undefined,
    answer: searchQuery.answer,
    citations: JSON.parse(searchQuery.citations) as PubMedCitation[],
    webResults: JSON.parse(searchQuery.webResults || "[]") as WebSearchResult[],
    userEvidence: JSON.parse(searchQuery.userEvidence || "[]") as Array<{
      content: string;
      title?: string;
      source: string;
      url?: string;
      type: "user_pdf" | "user_url";
    }>,
    useOnlyUserEvidence: searchQuery.useOnlyUserEvidence || false,
    usePubMedOnly: searchQuery.usePubMedOnly || false,
    maxResults: searchQuery.maxResults,
    responseLanguage: searchQuery.responseLanguage as "ja" | "en",
    previousQueryId: searchQuery.previousQueryId,
    createdAt: searchQuery.createdAt,
    isFavorite: searchQuery.isFavorite || false,
    userName: searchQuery.user?.name || "不明なユーザー",
    userId: searchQuery.user?.id,
  };
}

// Get search history
export async function getSearchHistory(input?: {
  sessionToken?: string;
  favoritesOnly?: boolean;
}) {
  // Check if user is authenticated
  let userId = await getCurrentUserId(input?.sessionToken);
  console.log(
    `getSearchHistory called with sessionToken: ${input?.sessionToken?.substring(0, 5) || "undefined"}... -> userId: ${userId?.substring(0, 5) || "null"}`,
  );

  if (!userId) {
    // Try fallback to currentUserId if session token authentication fails
    if (currentUserId) {
      console.log(
        `Using fallback authentication with currentUserId: ${currentUserId.substring(0, 5)}...`,
      );
      userId = currentUserId;
    } else {
      throw new Error("認証が必要です。医療従事者登録を行ってください。");
    }
  }

  // 検索条件を設定
  const whereCondition: any = { userId };

  // お気に入りのみを表示する場合
  if (input?.favoritesOnly) {
    whereCondition.isFavorite = true;
  }

  const searchQueries = await db.searchQuery.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    take: 50, // お気に入りを含めて表示できるように上限を増やす
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return searchQueries.map((sq) => ({
    id: sq.id,
    query: sq.query,
    answerPreview:
      sq.answer.substring(0, 150) + (sq.answer.length > 150 ? "..." : ""),
    createdAt: sq.createdAt,
    isFavorite: sq.isFavorite,
    userName: sq.user?.name || "不明なユーザー",
    userId: sq.user?.id,
  }));
}
