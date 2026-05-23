const axios = require('axios');

module.exports = async (req, res) => {
    // Hidden Config (Hex Obfuscated)
    // _ap = instagram internal api, _id = App ID required by IG
    const _ap = "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x77\x77\x77\x2e\x69\x6e\x73\x74\x61\x67\x72\x61\x6d\x2e\x63\x6f\x6d\x2f\x61\x70\x69\x2f\x76\x31\x2f\x75\x73\x65\x72\x73\x2f\x77\x65\x62\x5f\x70\x72\x6f\x66\x69\x6c\x65\x5f\x69\x6e\x66\x6f\x2f\x3f\x75\x73\x65\x72\x6e\x61\x6d\x65\x3d";
    const _id = "\x39\x33\x36\x36\x31\x39\x37\x34\x33\x33\x39\x32\x34\x35\x39"; // 936619743392459
    
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const query = req.url.split('?')[1] || "";
    const user = query.split('&')[0].replace(/[^a-zA-Z0-9._]/g, "");

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // --- Image Proxy Logic ---
    if (query.startsWith('img=')) {
        try {
            const link = Buffer.from(query.split('img=')[1], 'base64').toString('utf-8');
            const imgRes = await axios.get(link, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
            return res.send(Buffer.from(imgRes.data));
        } catch (e) {
            return res.status(404).send('Image Fetch Error');
        }
    }

    if (!user) return res.status(400).json({ error: "Missing Target" });

    try {
        // Hitting Instagram's hidden 'web_profile_info' endpoint
        const response = await axios.get(`${_ap}${user}`, {
            headers: {
                'X-IG-App-ID': _id,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-ASBD-ID': '129477',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `https://www.instagram.com/${user}/`
            }
        });

        const userData = response.data.data.user;

        if (!userData) throw new Error("Private or Not Found");

        // Real Data Extraction
        const name = userData.full_name || user;
        const bio = userData.biography || "No bio";
        const followers = userData.edge_followed_by.count;
        const following = userData.edge_follow.count;
        const is_private = userData.is_private;
        const pic = userData.profile_pic_url_hd || userData.profile_pic_url;

        // Masking the profile pic URL
        const secure_pic = `${protocol}://${host}/?img=${Buffer.from(pic).toString('base64')}`;

        return res.status(200).json({
            status: "success",
            data: {
                username: user,
                display_name: name,
                profile_pic: secure_pic,
                followers: followers.toLocaleString(),
                following: following.toLocaleString(),
                bio: bio,
                account_type: is_private ? "Private" : "Public"
            },
            apiOwner: "Divyansh Deewana"
        });

    } catch (err) {
        // Fallback agar API block hoti hai toh simple scraping koshish karega
        return res.status(403).json({
            status: "fail",
            message: "Instagram Firewall detected the request. Change Vercel Region to Mumbai or Singapore.",
            error_code: err.response?.status || 500,
            apiOwner: "Divyansh Deewana"
        });
    }
};
