const axios = require('axios');

module.exports = async (req, res) => {
    // Hidden System Config (Hex Obfuscated)
    const _0x_u = "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x77\x77\x77\x2e\x69\x6e\x73\x74\x61\x67\x72\x61\x6d\x2e\x63\x6f\x6d\x2f";
    const _0x_e = "\x65\x6d\x62\x65\x64\x2f"; // "embed/"
    
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const query = req.url.split('?')[1] || "";
    const username = query.split('&')[0].replace(/[^a-zA-Z0-9._]/g, "");

    res.setHeader('Access-Control-Allow-Origin', '*');

    // --- Logic 1: Image Proxy System (To hide IG Domain) ---
    if (query.startsWith('img=')) {
        try {
            const rawImg = Buffer.from(query.split('img=')[1], 'base64').toString('utf-8');
            const imgRes = await axios.get(rawImg, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', imgRes.headers['content-type']);
            return res.send(Buffer.from(imgRes.data));
        } catch (e) {
            return res.status(404).send('Not Found');
        }
    }

    if (!username) return res.status(400).json({ error: "Missing Target" });

    try {
        // Hitting the Embed Endpoint (Less likely to be blocked)
        const response = await axios.get(`${_0x_u}${username}/${_0x_e}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        const html = response.data;

        // --- DATA MINING VIA INTERNAL JSON ---
        // Instagram embed page contains a window.__additionalDataLoaded script
        const jsonMatch = html.match(/\\\\"shortcode_media\\\\":\s*({.*?})\s*}/) || 
                          html.match(/window\._sharedData\s*=\s*({.*?});/);
        
        // Alternative Scraping Logic for Embed
        const name = html.match(/\\"full_name\\":\\"([^\\"]+)\\"/)?.[1] || username;
        const pic = html.match(/\\"profile_pic_url\\":\\"([^\\"]+)\\"/)?.[1]?.replace(/\\/g, '') || null;
        const followers = html.match(/\\"edge_followed_by\\":\{\\"count\\":(\d+)\}/)?.[1] || 
                          html.match(/([\d,.]+[KkMm]?) Followers/)?.[1] || "0";
        const following = html.match(/\\"edge_follow\\":\{\\"count\\":(\d+)\}/)?.[1] || "0";
        const bio = html.match(/\\"biography\\":\\"([^\\"]+)\\"/)?.[1]?.replace(/\\u([0-9a-fA-F]{4})/g, (m, c) => String.fromCharCode(parseInt(c, 16))) || "No bio";

        // Proxy Image to hide direct Instagram Link
        const secure_pic = pic ? `${protocol}://${host}/?img=${Buffer.from(pic).toString('base64')}` : null;

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            status: "success",
            data: {
                username: username,
                display_name: name,
                profile_pic: secure_pic,
                followers: followers,
                following: following,
                bio: bio
            },
            apiOwner: "Divyansh Deewana"
        });

    } catch (err) {
        return res.status(403).json({
            status: "fail",
            message: "Encryption check failed. Target is private or system is rate-limited.",
            apiOwner: "Divyansh Deewana"
        });
    }
};
