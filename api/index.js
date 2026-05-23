const axios = require('axios');

module.exports = async (req, res) => {
    // Hidden internal endpoints
    const _0x_base = "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x77\x77\x77\x2e\x69\x6e\x73\x74\x61\x67\x72\x61\x6d\x2e\x63\x6f\x6d\x2f";
    const _0x_api = "\x61\x70\x69\x2f\x76\x31\x2f\x75\x73\x65\x72\x73\x2f\x77\x65\x62\x5f\x70\x72\x6f\x66\x69\x6c\x65\x5f\x69\x6e\x66\x6f\x2f\x3f\x75\x73\x65\x72\x6e\x61\x6d\x65\x3d";
    
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const query = req.url.split('?')[1] || "";
    const username = query.split('&')[0].replace(/[^a-zA-Z0-9._]/g, "");

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // Image Proxy Logic (To bypass direct link blocking)
    if (query.startsWith('view_img=')) {
        try {
            const rawUrl = Buffer.from(query.split('view_img=')[1], 'base64').toString('utf-8');
            const imgRes = await axios.get(rawUrl, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', 'image/jpeg');
            return res.send(imgRes.data);
        } catch (e) { return res.status(404).send('Not Found'); }
    }

    if (!username) return res.status(400).json({ status: "fail", message: "Missing target username" });

    try {
        // --- NEXT LEVEL STEALTH HEADERS ---
        // Hum yahan Instagram ka official APP-ID aur randomized headers bhej rahe hain
        const response = await axios.get(`${_0x_base}${_0x_api}${username}`, {
            headers: {
                'X-IG-App-ID': '936619743392459', // Official Web App ID
                'X-ASBD-ID': '129477',
                'X-IG-WWW-Claim': '0',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${_0x_base}${username}/`,
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            },
            timeout: 15000
        });

        const user = response.data.data.user;

        if (!user) throw new Error("Private or Not Found");

        // Profile Pic Masking
        const rawPic = user.profile_pic_url_hd || user.profile_pic_url;
        const maskedPic = `${protocol}://${host}/?view_img=${Buffer.from(rawPic).toString('base64')}`;

        return res.status(200).json({
            status: "success",
            data: {
                username: username,
                name: user.full_name,
                followers: user.edge_followed_by.count,
                following: user.edge_follow.count,
                bio: user.biography || "No bio set",
                profile_pic: maskedPic,
                posts: user.edge_owner_to_timeline_media?.count || 0,
                is_private: user.is_private
            },
            apiOwner: "Divyansh Deewana"
        });

    } catch (err) {
        // --- BACKUP SCRAPER (If Internal API fails) ---
        try {
            const fbResponse = await axios.get(`${_0x_base}${username}/?__a=1&__d=dis`);
            const fbData = fbResponse.data.graphql.user;
            
            return res.status(200).json({
                status: "success",
                source: "backup_resolver",
                data: {
                    username: username,
                    name: fbData.full_name,
                    followers: fbData.edge_followed_by.count,
                    following: fbData.edge_follow.count,
                    bio: fbData.biography,
                    profile_pic: fbData.profile_pic_url_hd
                },
                apiOwner: "Divyansh Deewana"
            });
        } catch (e) {
            return res.status(403).json({
                status: "fail",
                message: "Vercel IP is heavily blocked by Instagram. Try hitting the API 2-3 times.",
                error_debug: err.message,
                apiOwner: "Divyansh Deewana"
            });
        }
    }
};
