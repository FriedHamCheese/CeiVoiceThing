// Native fetch available in Node 18+

const API_URL = 'http://localhost:5001/admin/tickets';

async function testEP03() {
    console.log("Starting EP03 Backend Verification...");

    try {
        // 1. Get Specialists
        console.log("Testing GET /specialists...");
        const specRes = await fetch(`${API_URL}/specialists`);
        if (!specRes.ok) {
            console.error("GET /specialists failed:", specRes.status, await specRes.text());
            return;
        }
        const specialists = await specRes.json();
        console.log("Specialists found:", specialists.length);

        // 2. Get a New Ticket ID to test with
        console.log("Fetching tickets to find a target...");
        const tickRes = await fetch(API_URL);
        const { tickets } = await tickRes.json();
        const activeTicket = tickets.find(t => t.type === 'new');

        if (activeTicket) {
            const ticketID = activeTicket.id;
            console.log(`Testing with Ticket ID: ${ticketID}`);

            // 3. Update Ticket
            console.log("Testing PATCH /:id (Update Status & Assignee)...");
            const updateRes = await fetch(`${API_URL}/${ticketID}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Assigned', assigneeID: specialists[0].id })
            });
            console.log("Update Status:", updateRes.status);

            // 4. Add Comment
            console.log("Testing POST /:id/comment...");
            const commentRes = await fetch(`${API_URL}/${ticketID}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: "Test comment from verification script", authorEmail: "verifier@test.com" })
            });
            console.log("Add Comment Status:", commentRes.status);

            // 5. Check History
            console.log("Testing GET /:id/history...");
            const historyRes = await fetch(`${API_URL}/${ticketID}/history`);
            const history = await historyRes.json();
            console.log("History entries found:", history.length);
            console.log("Latest Action:", history[0]?.action, "-", history[0]?.details);

            // 6. Check Comments
            console.log("Testing GET /:id/comments...");
            const commentsRes = await fetch(`${API_URL}/${ticketID}/comments`);
            const comments = await commentsRes.json();
            console.log("Comments found:", comments.length);
            console.log("Latest Comment:", comments[0]?.text);
        } else {
            console.log("No active tickets found to test with. Please promote a draft first.");
        }

    } catch (error) {
        console.error("Verification failed:", error);
    }
}

testEP03();
