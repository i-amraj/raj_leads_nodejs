const panelText = `
FITNESS FORWARD UNISEX GYM
4.7 (64)
Gym in Kanpur, Uttar Pradesh
Address: K-639, near Bajrang Chauraha, K Block, Yashoda Nagar, Kanpur, Uttar Pradesh 208021
Phone: 085749 35666
Hours: 
Open · Closes 9:30 pm
Confirmed by phone call 8 weeks ago
`;

const strictPhoneRegex = /((\+?91|0)?\s?\d{3,5}[-. \s]?\d{3,5}[-. \s]?\d{0,5})/;

const lines = panelText.split('\n');
let phone = null;

for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 6 || cleanLine.includes('Review')) continue;

    const digitCount = cleanLine.replace(/\D/g, '').length;
    if (digitCount >= 10 && digitCount <= 13) {
        if (strictPhoneRegex.test(cleanLine)) {
            if (!cleanLine.includes(':') && !cleanLine.includes('AM') && !cleanLine.includes('PM') && !cleanLine.includes(',')) {
                if (!/^\(\d+\)$/.test(cleanLine)) {
                    phone = cleanLine;
                    console.log(`MATCH: ${cleanLine}`);
                    break;
                }
            }
        }
    }
}

if (!phone) console.log("NO MATCH FOUND");
