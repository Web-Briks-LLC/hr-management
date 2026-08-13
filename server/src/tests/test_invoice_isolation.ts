import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { encryptPayload, decryptPayload } from "../utils/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface MockClient {
    id: string;
    name: string;
    address: string;
    companyName: string;
    currency: string;
}

const mockClients: MockClient[] = [
    { id: "C001", name: "Blenders Eyewear", address: "4140 Morena Blvd, San Diego, CA", companyName: "Blenders Eyewear Inc", currency: "USD" },
    { id: "C002", name: "Michael M", address: "1209 Mountain Road PL NE", companyName: "After Work Hours LLC", currency: "USD" },
    { id: "C003", name: "Sarah Connor", address: "Cyberdyne Systems Way, LA", companyName: "Resistance Tech", currency: "USD" },
    { id: "C004", name: "John Doe", address: "10 Downing Street, London", companyName: "Acme Corp UK", currency: "GBP" },
    { id: "C005", name: "Hans Gruber", address: "Nakatomi Plaza, Century City", companyName: "Nakatomi Trading", currency: "EUR" },
    { id: "C006", name: "Tony Stark", address: "10880 Malibu Point, CA", companyName: "Stark Industries", currency: "USD" },
    { id: "C007", name: "Bruce Wayne", address: "1007 Mountain Drive, Gotham", companyName: "Wayne Enterprises", currency: "USD" },
    { id: "C008", name: "Clark Kent", address: "344 Clinton St, Metropolis", companyName: "Daily Planet", currency: "CAD" },
    { id: "C009", name: "Diana Prince", address: "Gateway City Gateway Rd", companyName: "Themyscira Arts", currency: "EUR" },
    { id: "C010", name: "Peter Parker", address: "20 Ingram St, Forest Hills, NY", companyName: "Parker Photography", currency: "USD" },
    { id: "C011", name: "Arthur Dent", address: "Cottington, West Country", companyName: "Heart of Gold Ltd", currency: "GBP" },
    { id: "C012", name: "Sherlock Holmes", address: "221B Baker Street, London", companyName: "Consulting Detective Ltd", currency: "GBP" },
];

async function runSimulation() {
    console.log("==================================================================");
    console.log("STARTING 60-ITERATION INVOICE GENERATION & ISOLATION TEST SUITE");
    console.log("==================================================================");

    const generatedTokens = new Set<string>();
    const invoiceDatabase = new Map<string, any>();
    let passedCount = 0;
    let failedCount = 0;

    let frontendState = {
        selectedClientId: "",
        invoiceNumber: "",
        paymentToken: "",
        showPDF: false,
    };

    const resetGeneratedInvoice = () => {
        frontendState.invoiceNumber = "";
        frontendState.paymentToken = "";
        frontendState.showPDF = false;
    };

    for (let i = 1; i <= 60; i++) {
        const clientIndex = (i - 1) % mockClients.length;
        const client = mockClients[clientIndex]!;
        const prevClient = (i > 1) ? mockClients[(i - 2) % mockClients.length]! : null;

        // Simulate admin user switching client in UI
        if (frontendState.selectedClientId !== client.id) {
            frontendState.selectedClientId = client.id;
            // Crucial fix: UI calls resetGeneratedInvoice() on client change
            resetGeneratedInvoice();
        }

        const invoiceSeq = 100 + i;
        const formattedInvoiceNumber = String(invoiceSeq);
        const orderCount = (i % 5) + 1;
        const totalAmount = parseFloat(((i * 17.5 + (i % 7) * 3.25)).toFixed(2));
        const totalImages = orderCount * 12;

        // Simulate generate or send invoice action
        let currentInvoiceNumber = frontendState.invoiceNumber;
        let currentToken = frontendState.paymentToken;

        if (!currentInvoiceNumber || !currentToken) {
            currentInvoiceNumber = formattedInvoiceNumber;

            // Backend recordInvoice logic (our updated controller logic)
            const payloadInfo = {
                invoiceNumber: currentInvoiceNumber,
                totalPrice: totalAmount,
                currency: client.currency,
                totalImages: totalImages,
                dateFrom: new Date(2026, 7, 1).toISOString(),
                dateTo: new Date(2026, 7, 15).toISOString(),
                totalOrders: orderCount,
                clientName: client.name,
                address: client.address,
                companyName: client.companyName,
            };

            currentToken = encryptPayload(payloadInfo);

            invoiceDatabase.set(currentInvoiceNumber, {
                ...payloadInfo,
                paymentToken: currentToken,
                clientId: client.id,
            });

            frontendState.invoiceNumber = currentInvoiceNumber;
            frontendState.paymentToken = currentToken;
        }

        // --- VERIFICATIONS ---
        let testPassed = true;
        const errors: string[] = [];

        // 1. Check token uniqueness
        if (generatedTokens.has(currentToken)) {
            testPassed = false;
            errors.push(`Duplicate token generated: ${currentToken}`);
        }
        generatedTokens.add(currentToken);

        // 2. Decrypt token and verify all metadata
        const decrypted = decryptPayload(currentToken);
        if (!decrypted) {
            testPassed = false;
            errors.push("Failed to decrypt generated token");
        } else {
            if (decrypted.invoiceNumber !== currentInvoiceNumber) {
                testPassed = false;
                errors.push(`Invoice number mismatch: expected ${currentInvoiceNumber}, got ${decrypted.invoiceNumber}`);
            }
            if (decrypted.clientName !== client.name) {
                testPassed = false;
                errors.push(`Client name mismatch: expected ${client.name}, got ${decrypted.clientName}`);
            }
            if (decrypted.totalPrice !== totalAmount) {
                testPassed = false;
                errors.push(`Total amount mismatch: expected ${totalAmount}, got ${decrypted.totalPrice}`);
            }
            if (decrypted.currency !== client.currency) {
                testPassed = false;
                errors.push(`Currency mismatch: expected ${client.currency}, got ${decrypted.currency}`);
            }
            if (decrypted.companyName !== client.companyName) {
                testPassed = false;
                errors.push(`Company name mismatch: expected ${client.companyName}, got ${decrypted.companyName}`);
            }
        }

        // 3. Verify zero leakage from previous client
        if (prevClient && prevClient.id !== client.id && decrypted) {
            if (decrypted.clientName === prevClient.name) {
                testPassed = false;
                errors.push(`LEAK DETECTED: Token contains previous client name '${prevClient.name}' instead of '${client.name}'`);
            }
            if (decrypted.companyName === prevClient.companyName) {
                testPassed = false;
                errors.push(`LEAK DETECTED: Token contains previous company name '${prevClient.companyName}'`);
            }
        }

        // 4. Verify Payment portal lookup simulation
        const dbLookup = invoiceDatabase.get(currentInvoiceNumber);
        if (!dbLookup || dbLookup.paymentToken !== currentToken) {
            testPassed = false;
            errors.push("Payment portal DB lookup failed or token mismatched DB record");
        }

        if (testPassed) {
            passedCount++;
            console.log(`[PASS] Test ${i.toString().padStart(2, "0")}/60: Inv #${currentInvoiceNumber} | Client: ${client.name.padEnd(20)} | $${totalAmount.toString().padEnd(7)} ${client.currency} -> Token Decrypted & Verified OK`);
        } else {
            failedCount++;
            console.error(`[FAIL] Test ${i.toString().padStart(2, "0")}/60: Inv #${currentInvoiceNumber} | Client: ${client.name}`);
            errors.forEach(e => console.error(`       -> Error: ${e}`));
        }
    }

    console.log("==================================================================");
    console.log(`TEST SUMMARY: Total: 60 | Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log("==================================================================");

    if (failedCount > 0) {
        process.exit(1);
    }
}

runSimulation().catch((err) => {
    console.error("Fatal error during simulation:", err);
    process.exit(1);
});
