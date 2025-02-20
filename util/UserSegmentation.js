class UserSegmentation {
    constructor(req, userSegmentationData) {
        this.req = req;
        this.userSegmentationData = userSegmentationData;
    }

    isSegmentedUser() {
        const { segmentationURLAddressInclude, segmentationURLAddressExclude, segmentationIpAddressInclude, segmentationIpAddressExclude, segmentationDevice } = this.userSegmentationData;
        const reqURL = this.req.query.url;
        const ipAddress = this.req.headers['x-forwarded-for'] || this.req.connection.remoteAddress || this.req.socket.remoteAddress;
        const reqDevice = this.req.device.type;

        if (this.isNonEmptyArray(segmentationURLAddressInclude) && !this.checkIncludeURLSegmentation(segmentationURLAddressInclude, reqURL)) {
            return false;
        }

        if (this.isNonEmptyArray(segmentationURLAddressExclude) && !this.checkExcludeURLSegmentation(segmentationURLAddressExclude, reqURL)) {
            return false;
        }

        if (this.isNonEmptyArray(segmentationIpAddressInclude) && this.checkIncludeIPSegmentation(segmentationIpAddressInclude, ipAddress)) {
            return false;
        }

        if (this.isNonEmptyArray(segmentationIpAddressExclude) && this.checkExcludeIPSegmentation(segmentationIpAddressExclude, ipAddress)) {
            return false;
        }

        if (segmentationDevice !== '' && !reqDevice.includes(segmentationDevice)) {
            return false;
        }

        return true;
    }


    checkIncludeURLSegmentation(segmentationURLIncludeList, reqURL) {
        for (const segmentationURL of segmentationURLIncludeList) {
        const { include_url_type, include_url } = segmentationURL;
        switch (include_url_type) {
            case 'ac_user_segmentation_url_exact':
                if (reqURL !== include_url) {
                    return false;
                }
                break;
            case 'ac_user_segmentation_url_contains':
                if (!reqURL.includes(include_url)) {
                    return false;
                }
                break;
            case 'ac_user_segmentation_url_starts_with':
                if (!reqURL.startsWith(include_url)) {
                    return false;
                }
                break;
            case 'ac_user_segmentation_url_matches_regex':
                const regex = new RegExp(include_url);
                if (!regex.test(reqURL)) {
                    return false;
                }
                break;
        }
        }

        return true;
    }

    checkExcludeURLSegmentation(segmentationData, reqURL) {
        for (const segmentation of segmentationData) {
        const { exclude_url_type, exclude_url } = segmentation;

        switch (exclude_url_type) {
            case 'ac_user_segmentation_url_exact':
                if (reqURL === exclude_url) {
                    return false;
                }
                break;
            case 'ac_user_segmentation_url_contains':
                if (reqURL.includes(exclude_url)) {
                    return false;
                }
                break;
            case 'ac_user_segmentation_url_starts_with':
                if (reqURL.startsWith(exclude_url)) {
                    return false;
                }
                break;
            case 'ac_user_segmentation_url_matches_regex':
                const regex = new RegExp(exclude_url);
                if (regex.test(reqURL)) {
                    return false;
                }
                break;
        }
        }

        return true;
    }

    checkIncludeIPSegmentation(segmentationIpAddressInclude, ipAddress) {
        const includedIPs = segmentationIpAddressInclude
        .map(item => item.include_ip_address.trim())
        .filter(ip => ip !== '');

        return !includedIPs.includes(ipAddress);
    }

    checkExcludeIPSegmentation(segmentationIpAddressExclude, ipAddress) {
        const excludedIPs = segmentationIpAddressExclude
        .map(item => item.exclude_ip_address.trim())
        .filter(ip => ip !== '');

        return excludedIPs.includes(ipAddress);
    }

    isNonEmptyArray(arr) {
        return Array.isArray(arr) && arr.length > 0;
    }
}

module.exports = {
    UserSegmentation
};
