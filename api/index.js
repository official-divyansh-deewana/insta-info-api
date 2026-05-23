const axios = require('axios');

module.exports = async (req, res) => {
    // URL se username nikalna (?oye_pagloo)
    const username = req.url.split('?')[1]?.split('&')[0].replace(/[^a-zA-Z0-9._]/g, "");

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (!username) {
        return res.status(400).json({ error: "Username is required. Example: /?oye_pagloo" });
    }

    try {
        // Instagram profile ko as a "Google Bot" ya "iPhone Safari" hit karna
        const response = await axios.get(`https://www.instagram.com/${username}/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000
        });

        const html = response.data;

        // --- DATA EXTRACTION USING REGEX (No external parser) ---

        // 1. Display Name (Extracting from <title> or og:title)
        const nameMatch = html.match(/<meta property="og:title" content="([^"]+)\(@/);
        const displayName = nameMatch ? nameMatch[1].trim() : username;

        // 2. Profile Pic (Extracting from og:image)
        const picMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        const profilePic = picMatch ? picMatch[1] : null;

        // 3. Followers & Following (Extracting from meta description)
        // Meta description looks like: "1,234 Followers, 567 Following, 89 Posts..."
        const descMatch = html.match(/<meta content="([^"]+)" name="description"/);
        const description = descMatch ? descMatch[1] : "";

        const followers = description.match(/([\d,.]+[KkMm]?) Followers/)?.[1] || "0";
        const following = description.match(/([\d,.]+[KkMm]?) Following/)?.[1] || "0";

        // 4. Bio (Extracting from og:description or JSON-LD if available)
        // Bio usually appears after "Posts -" in the description tag
        const bioParts = description.split('- See Instagram photos and videos')[0].split('Posts -');
        const bio = bioParts.length > 1 ? bioParts[1].trim() : "No bio available";

        res.status(200).json({
            status: "success",
            data: {
                username: username,
                display_name: displayName,
                profile_pic: profilePic,
                followers_count: followers,
                following_count: following,
                bio: bio
            },
            apiOwner: "Divyansh Deewana"
        });

    } catch (error) {
        // Agar Instagram block karega toh ye 404 ya 302 dega
        res.status(500).json({
            status: "fail",
            message: "Instagram blocked the scraper or account is private/not found.",
            error_code: error.response?.status || 500
        });
    }
};
