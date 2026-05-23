const axios = require('axios');

module.exports = async (req, res) => {
    // Hidden Config (No direct text to avoid detection)
    const _base = "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x77\x77\x77\x2e\x69\x6e\x73\x74\x61\x67\x72\x61\x6d\x2e\x63\x6f\x6d\x2f";
    const _api = "\x61\x70\x69\x2f\x76\x31\x2f\x75\x73\x65\x72\x73\x2f\x77\x65\x62\x5f\x70\x72\x6f\x66\x69\x6c\x65\x5f\x69\x6e\x66\x6f\x2f\x3f\x75\x73\x65\x72\x6e\x61\x6d\x65\x3d";
    
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const query = req.url.split('?')[1] || "";
    const user = query.split('&')[0].replace(/[^a-zA-Z0-9._]/g, "");

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // Proxy for Media (To bypass CORS/Detection)
    if (query.startsWith('p=')) {
        try {
            const url = Buffer.from(query.split('p=')[1], 'base64').toString();
            const img = await axios.get(url, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', 'image/jpeg');
            return res.send(img.data);
        } catch (e) { return res.status(404).send("Error"); }
    }

    if (!user) return res.status(400).json({ status: "error", message: "Target required" });

    try {
        /* 
           NEW STEALTH STRATEGY:
           Hum Instagram ke "Mobile Internal App" ke headers simulate karenge.
           Ye headers Instagram ke firewall ko 'Force' karte hain real data dene ke liye.
        */
        const response = await axios.get(`${_base}${_api}${user}`, {
            headers: {
                'X-IG-App-ID': '936619743392459',
                'X-ASBD-ID': '129477',
                'X-IG-WWW-Claim': '0',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${_base}${user}/`
            },
            timeout: 10000
        });

        const data = response.data.data.user;
        if (!data) throw new Error("Empty Response");

        const pic_raw = data.profile_pic_url_hd || data.profile_pic_url;
        const pic_proxy = `${protocol}://${host}/?p=${Buffer.from(pic_raw).toString('base64')}`;

        return res.status(200).json({
            status: "success",
            data: {
                username: user,
                full_name: data.full_name,
                followers: data.edge_followed_by.count,
                following: data.edge_follow.count,
                bio: data.biography || "No Bio",
                profile_pic: pic_proxy,
                posts: data.edge_owner_to_timeline_media?.count || 0
            },
            apiOwner: "Divyansh Deewana"
        });

    } catch (err) {
        /* 
           CRITICAL BACKUP: 
           Agar main API block hoti hai, toh hum OEmbed Meta-Scraping par switch karenge.
        */
        try {
            const fbResponse = await axios.get(`${_base}${user}/?__a=1&__d=dis`);
            const fbData = fbResponse.data.graphql.user;
            return res.status(200).json({
                status: "success",
                source: "backup_resolver",
                data: {
                    username: user,
                    full_name: fbData.full_name,
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
                message: "Instagram fully blocked this server's IP. Please wait or redeploy.",
                apiOwner: "Divyansh Deewana"
            });
        }
    }
};
