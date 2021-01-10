﻿/*
Technitium DNS Server
Copyright (C) 2021  Shreyas Zare (shreyas@technitium.com)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

var token = null;
var refreshTimerHandle;

function showPageLogin() {
    hideAlert();

    $("#pageMain").hide();
    $("#mnuUser").hide();

    $("#txtUser").val("");
    $("#txtPass").val("");
    $("#btnLogin").button('reset');
    $("#pageLogin").show();

    $("#txtUser").focus();

    if (refreshTimerHandle != null) {
        clearInterval(refreshTimerHandle);
        refreshTimerHandle = null;
    }
}

function showPageMain(username) {
    hideAlert();

    $("#pageLogin").hide();

    $("#mnuUserDisplayName").text(username);
    $("#txtChangePasswordUsername").val(username);
    $("#mnuUser").show();

    $(".nav-tabs li").removeClass("active");
    $(".tab-pane").removeClass("active");
    $("#mainPanelTabListDashboard").addClass("active");
    $("#mainPanelTabPaneDashboard").addClass("active");
    $("#dhcpTabListLeases").addClass("active");
    $("#dhcpTabPaneLeases").addClass("active");
    $("#divDhcpViewScopes").show();
    $("#divDhcpEditScope").hide();

    $("#divViewZones").show();
    $("#divEditZone").hide();

    $("#txtDnsClientNameServer").val("This Server {this-server}");
    $("#txtDnsClientDomain").val("");
    $("#optDnsClientType").val("A");
    $("#optDnsClientProtocol").val("UDP");
    $("#divDnsClientLoader").hide();
    $("#divDnsClientOutput").text("");
    $("#preDnsClientOutput").hide();

    $("#divLogViewer").hide();

    $("#pageMain").show();

    loadDnsSettings();
    refreshDashboard();
    refreshCachedZonesList();
    refreshAllowedZonesList();
    refreshBlockedZonesList();
    checkForUpdate();

    refreshTimerHandle = setInterval(function () {
        var type = $('input[name=rdStatType]:checked').val();
        if (type === "lastHour")
            refreshDashboard(true);
    }, 60000);
}

$(function () {
    var headerHtml = $("#header").html();

    $("#header").html("<div class=\"title\"><a href=\"/\"><img src=\"/img/logo25x25.png\" alt=\"Technitium Logo\" /><span class=\"text\" style=\"color: #ffffff;\">Technitium</span></a>" + headerHtml + "</div>");
    $("#footer").html("<div class=\"content\"><a href=\"https://technitium.com/\" target=\"_blank\">Technitium</a> | <a href=\"https://blog.technitium.com/\" target=\"_blank\">Blog</a> | <a href=\"https://go.technitium.com/?id=35\" target=\"_blank\">Become A Patron</a> | <a href=\"https://dnsclient.net/\" target=\"_blank\">DNS Client</a> | <a href=\"https://github.com/TechnitiumSoftware/DnsServer\" target=\"_blank\"><i class=\"fa fa-github\"></i>&nbsp;GitHub</a> | <a href=\"https://technitium.com/aboutus.html\" target=\"_blank\">About</a></div>");

    //dropdown list box support
    $('.dropdown').on('click', 'a', function (e) {
        e.preventDefault();

        var itemText = $(this).text();
        $(this).closest('.dropdown').find('input').val(itemText);

        if ((itemText.indexOf("TLS") !== -1) || (itemText.indexOf(":853") !== -1))
            $("#optDnsClientProtocol").val("TLS");
        else if (itemText.indexOf("HTTPS-JSON") !== -1)
            $("#optDnsClientProtocol").val("HttpsJson");
        else if ((itemText.indexOf("HTTPS") !== -1) || (itemText.indexOf("http://") !== -1) || (itemText.indexOf("https://") !== -1))
            $("#optDnsClientProtocol").val("Https");
        else {
            switch ($("#optDnsClientProtocol").val()) {
                case "UDP":
                case "TCP":
                    break;

                default:
                    $("#optDnsClientProtocol").val("UDP");
                    break;
            }
        }
    });

    $("input[type=radio][name=rdProxyType]").change(function () {
        var proxyType = $('input[name=rdProxyType]:checked').val().toLowerCase();
        if (proxyType === "none") {
            $("#txtProxyAddress").prop("disabled", true);
            $("#txtProxyPort").prop("disabled", true);
            $("#txtProxyUsername").prop("disabled", true);
            $("#txtProxyPassword").prop("disabled", true);
            $("#txtProxyBypassList").prop("disabled", true);
        }
        else {
            $("#txtProxyAddress").prop("disabled", false);
            $("#txtProxyPort").prop("disabled", false);
            $("#txtProxyUsername").prop("disabled", false);
            $("#txtProxyPassword").prop("disabled", false);
            $("#txtProxyBypassList").prop("disabled", false);
        }
    });

    $("#chkAllowRecursion").click(function () {
        var allowRecursion = $("#chkAllowRecursion").prop('checked');
        $("#chkAllowRecursionOnlyForPrivateNetworks").prop('disabled', !allowRecursion);
    });

    $("#chkWebServiceEnableTls").click(function () {
        var webServiceEnableTls = $("#chkWebServiceEnableTls").prop("checked");
        $("#chkWebServiceHttpToTlsRedirect").prop("disabled", !webServiceEnableTls);
        $("#txtWebServiceTlsPort").prop("disabled", !webServiceEnableTls);
        $("#txtWebServiceTlsCertificatePath").prop("disabled", !webServiceEnableTls);
        $("#txtWebServiceTlsCertificatePassword").prop("disabled", !webServiceEnableTls);
    });

    $("#chkEnableDnsOverTls").click(function () {
        var enableDnsOverTls = $("#chkEnableDnsOverTls").prop("checked");
        var enableDnsOverHttps = $("#chkEnableDnsOverHttps").prop("checked");

        $("#txtDnsTlsCertificatePath").prop("disabled", !enableDnsOverTls && !enableDnsOverHttps);
        $("#txtDnsTlsCertificatePassword").prop("disabled", !enableDnsOverTls && !enableDnsOverHttps);
    });

    $("#chkEnableDnsOverHttps").click(function () {
        var enableDnsOverTls = $("#chkEnableDnsOverTls").prop("checked");
        var enableDnsOverHttps = $("#chkEnableDnsOverHttps").prop("checked");

        $("#txtDnsTlsCertificatePath").prop("disabled", !enableDnsOverTls && !enableDnsOverHttps);
        $("#txtDnsTlsCertificatePassword").prop("disabled", !enableDnsOverTls && !enableDnsOverHttps);
    });

    $("#chkEnableLogging").click(function () {
        var enableLogging = $("#chkEnableLogging").prop("checked");
        $("#chkLogQueries").prop("disabled", !enableLogging);
        $("#chkUseLocalTime").prop("disabled", !enableLogging);
        $("#txtLogFolderPath").prop("disabled", !enableLogging);
    });

    $("#chkServeStale").click(function () {
        var serveStale = $("#chkServeStale").prop("checked");
        $("#txtServeStaleTtl").prop("disabled", !serveStale);
    });

    $("#optQuickBlockList").change(function () {

        var selectedOption = $("#optQuickBlockList").val();

        switch (selectedOption) {
            case "blank":
                break;

            case "none":
                $("#txtBlockListUrls").val("");
                break;

            case "default":
                var defaultList = "";

                defaultList += "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts" + "\n";
                defaultList += "https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt" + "\n";
                defaultList += "https://s3.amazonaws.com/lists.disconnect.me/simple_ad.txt" + "\n";

                $("#txtBlockListUrls").val(defaultList);
                break;

            default:
                var existingList = $("#txtBlockListUrls").val();

                if (existingList.indexOf(selectedOption) < 0) {
                    existingList += selectedOption + "\n";
                    $("#txtBlockListUrls").val(existingList);
                }

                break;
        }
    });

    $("#optQuickForwarders").change(function () {

        var selectedOption = $("#optQuickForwarders").val();

        if (selectedOption !== "blank") {
            if (($('input[name=rdProxyType]:checked').val() === "Socks5") && ($("#txtProxyAddress").val() === "127.0.0.1") && ($("#txtProxyPort").val() === "9150")) {
                $("#rdProxyTypeNone").prop("checked", true);
                $("#txtProxyAddress").prop("disabled", true);
                $("#txtProxyPort").prop("disabled", true);
                $("#txtProxyUsername").prop("disabled", true);
                $("#txtProxyPassword").prop("disabled", true);
                $("#txtProxyAddress").val("");
                $("#txtProxyPort").val("");
                $("#txtProxyUsername").val("");
                $("#txtProxyPassword").val("");
            }
        }

        switch (selectedOption) {
            case "cloudflare-udp":
                $("#txtForwarders").val("1.1.1.1\r\n1.0.0.1");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "cloudflare-udp-ipv6":
                $("#txtForwarders").val("[2606:4700:4700::1111]\r\n[2606:4700:4700::1001]");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "cloudflare-tcp":
                $("#txtForwarders").val("1.1.1.1\r\n1.0.0.1");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "cloudflare-tcp-ipv6":
                $("#txtForwarders").val("[2606:4700:4700::1111]\r\n[2606:4700:4700::1001]");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "cloudflare-tls":
                $("#txtForwarders").val("cloudflare-dns.com (1.1.1.1:853)\r\ncloudflare-dns.com (1.0.0.1:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "cloudflare-tls-ipv6":
                $("#txtForwarders").val("cloudflare-dns.com ([2606:4700:4700::1111]:853)\r\ncloudflare-dns.com ([2606:4700:4700::1001]:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "cloudflare-https":
                $("#txtForwarders").val("https://cloudflare-dns.com/dns-query (1.1.1.1)\r\nhttps://cloudflare-dns.com/dns-query (1.0.0.1)");
                $("#rdForwarderProtocolHttps").prop("checked", true);
                break;

            case "cloudflare-json":
                $("#txtForwarders").val("https://cloudflare-dns.com/dns-query (1.1.1.1)\r\nhttps://cloudflare-dns.com/dns-query (1.0.0.1)");
                $("#rdForwarderProtocolHttpsJson").prop("checked", true);
                break;

            case "cloudflare-tor":
                $("#txtForwarders").val("dns4torpnlfs2ifuz2s2yf3fc7rdmsbhm6rw75euj35pac6ap25zgqad.onion");
                $("#rdForwarderProtocolTcp").prop("checked", true);

                if ($('input[name=rdProxyType]:checked').val() !== "Socks5") {
                    $("#rdProxyTypeSocks5").prop("checked", true);
                    $("#txtProxyAddress").val("127.0.0.1");
                    $("#txtProxyPort").val("9150");
                    $("#txtProxyAddress").prop("disabled", false);
                    $("#txtProxyPort").prop("disabled", false);
                    $("#txtProxyUsername").prop("disabled", false);
                    $("#txtProxyPassword").prop("disabled", false);
                }

                break;

            case "google-udp":
                $("#txtForwarders").val("8.8.8.8\r\n8.8.4.4");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "google-udp-ipv6":
                $("#txtForwarders").val("[2001:4860:4860::8888]\r\n[2001:4860:4860::8844]");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "google-tcp":
                $("#txtForwarders").val("8.8.8.8\r\n8.8.4.4");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "google-tcp-ipv6":
                $("#txtForwarders").val("[2001:4860:4860::8888]\r\n[2001:4860:4860::8844]");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "google-tls":
                $("#txtForwarders").val("dns.google (8.8.8.8:853)\r\ndns.google (8.8.4.4:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "google-tls-ipv6":
                $("#txtForwarders").val("dns.google ([2001:4860:4860::8888]:853)\r\ndns.google ([2001:4860:4860::8844]:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "google-https":
                $("#txtForwarders").val("https://dns.google/dns-query (8.8.8.8)\r\nhttps://dns.google/dns-query (8.8.4.4)");
                $("#rdForwarderProtocolHttps").prop("checked", true);
                break;

            case "google-json":
                $("#txtForwarders").val("https://dns.google/dns-query (8.8.8.8)\r\nhttps://dns.google/dns-query (8.8.4.4)");
                $("#rdForwarderProtocolHttpsJson").prop("checked", true);
                break;


            case "quad9-udp":
                $("#txtForwarders").val("9.9.9.9");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "quad9-udp-ipv6":
                $("#txtForwarders").val("[2620:fe::fe]");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "quad9-tcp":
                $("#txtForwarders").val("9.9.9.9");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "quad9-tcp-ipv6":
                $("#txtForwarders").val("[2620:fe::fe]");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "quad9-tls":
                $("#txtForwarders").val("dns.quad9.net (9.9.9.9:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "quad9-tls-ipv6":
                $("#txtForwarders").val("dns.quad9.net ([2620:fe::fe]:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "quad9-https":
                $("#txtForwarders").val("https://dns.quad9.net/dns-query (9.9.9.9)");
                $("#rdForwarderProtocolHttps").prop("checked", true);
                break;


            case "quad9-unsecure-udp":
                $("#txtForwarders").val("9.9.9.10");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "quad9-unsecure-udp-ipv6":
                $("#txtForwarders").val("[2620:fe::10]");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "quad9-unsecure-tcp":
                $("#txtForwarders").val("9.9.9.10");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "quad9-unsecure-tcp-ipv6":
                $("#txtForwarders").val("[2620:fe::10]");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "quad9-unsecure-tls":
                $("#txtForwarders").val("dns10.quad9.net (9.9.9.10:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "quad9-unsecure-tls-ipv6":
                $("#txtForwarders").val("dns10.quad9.net ([2620:fe::10]:853)");
                $("#rdForwarderProtocolTls").prop("checked", true);
                break;

            case "quad9-unsecure-https":
                $("#txtForwarders").val("https://dns10.quad9.net/dns-query (9.9.9.10)");
                $("#rdForwarderProtocolHttps").prop("checked", true);
                break;


            case "opendns-udp":
                $("#txtForwarders").val("208.67.222.222\r\n208.67.220.220");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "opendns-udp-ipv6":
                $("#txtForwarders").val("[2620:0:ccc::2]\r\n[2620:0:ccd::2]");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;

            case "opendns-tcp":
                $("#txtForwarders").val("208.67.222.222\r\n208.67.220.220");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;

            case "opendns-tcp-ipv6":
                $("#txtForwarders").val("[2620:0:ccc::2]\r\n[2620:0:ccd::2]");
                $("#rdForwarderProtocolTcp").prop("checked", true);
                break;


            case "opendns-fs-udp":
                $("#txtForwarders").val("208.67.222.123\r\n208.67.220.123");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;


            case "none":
                $("#txtForwarders").val("");
                $("#rdForwarderProtocolUdp").prop("checked", true);
                break;
        }
    });

    $("input[type=radio][name=rdStatType]").change(function () {
        refreshDashboard();
    });

    $("#lblDoHHost").text(window.location.hostname + ":8053");

    showPageLogin();
    login("admin", "admin");
});

function login(username, password) {

    var autoLogin = false;

    if (username == null) {
        username = $("#txtUser").val();
        password = $("#txtPass").val();
    }
    else {
        autoLogin = true;
    }

    if ((username === null) || (username === "")) {
        showAlert("warning", "Missing!", "Please enter username.");
        $("#txtUser").focus();
        return false;
    }

    if ((password === null) || (password === "")) {
        showAlert("warning", "Missing!", "Please enter password.");
        $("#txtPass").focus();
        return false;
    }

    var btn = $("#btnLogin").button('loading');

    HTTPRequest({
        url: "/api/login?user=" + encodeURIComponent(username) + "&pass=" + encodeURIComponent(password),
        success: function (responseJSON) {
            token = responseJSON.token;

            showPageMain(username);

            if ((username === "admin") && (password === "admin")) {
                $('#modalChangePassword').modal();
            }
        },
        error: function () {
            btn.button('reset');
            $("#txtUser").focus();

            if (autoLogin)
                hideAlert();
        }
    });

    return false;
}

function logout() {

    HTTPRequest({
        url: "/api/logout?token=" + token,
        success: function (responseJSON) {
            token = null;
            showPageLogin();
        },
        error: function () {
            token = null;
            showPageLogin();
        }
    });

    return false;
}

function resetChangePasswordModal() {

    $("#divChangePasswordAlert").html("");
    $("#txtChangePasswordNewPassword").val("");
    $("#txtChangePasswordConfirmPassword").val("");

    return false;
}

function changePassword() {

    var divChangePasswordAlert = $("#divChangePasswordAlert");
    var newPassword = $("#txtChangePasswordNewPassword").val();
    var confirmPassword = $("#txtChangePasswordConfirmPassword").val();

    if ((newPassword === null) || (newPassword === "")) {
        showAlert("warning", "Missing!", "Please enter new password.", divChangePasswordAlert);
        $("#txtChangePasswordNewPassword").focus();
        return false;
    }

    if ((confirmPassword === null) || (confirmPassword === "")) {
        showAlert("warning", "Missing!", "Please enter confirm password.", divChangePasswordAlert);
        $("#txtChangePasswordConfirmPassword").focus();
        return false;
    }

    if (newPassword !== confirmPassword) {
        showAlert("warning", "Mismatch!", "Passwords do not match. Please try again.", divChangePasswordAlert);
        $("#txtChangePasswordNewPassword").focus();
        return false;
    }

    var btn = $("#btnChangePasswordSave").button('loading');

    HTTPRequest({
        url: "/api/changePassword?token=" + token + "&pass=" + encodeURIComponent(newPassword),
        success: function (responseJSON) {
            $("#modalChangePassword").modal("hide");
            btn.button('reset');

            showAlert("success", "Password Changed!", "Password was changed successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        },
        objAlertPlaceholder: divChangePasswordAlert
    });

    return false;
}

function checkForUpdate() {

    HTTPRequest({
        url: "/api/checkForUpdate?token=" + token,
        success: function (responseJSON) {

            var lnkNewVersionAvailable = $("#lnkNewVersionAvailable");

            if (responseJSON.response.updateAvailable) {

                if (responseJSON.response.displayText == null)
                    responseJSON.response.displayText = "New Version Available!";

                lnkNewVersionAvailable.text(responseJSON.response.displayText);
                lnkNewVersionAvailable.attr("href", responseJSON.response.downloadLink);
                lnkNewVersionAvailable.show();
            }
            else {
                lnkNewVersionAvailable.hide();
            }
        },
        invalidToken: function () {
            showPageLogin();
        }
    });

    return false;
}

function loadDnsSettings() {

    var divDnsSettingsLoader = $("#divDnsSettingsLoader");
    var divDnsSettings = $("#divDnsSettings");

    divDnsSettings.hide();
    divDnsSettingsLoader.show();

    HTTPRequest({
        url: "/api/getDnsSettings?token=" + token,
        success: function (responseJSON) {
            document.title = responseJSON.response.dnsServerDomain + " - " + "Technitium DNS Server v" + responseJSON.response.version;
            $("#lblAboutVersion").text(responseJSON.response.version);

            $("#txtDnsServerDomain").val(responseJSON.response.dnsServerDomain);
            $("#lblDnsServerDomain").text(" - " + responseJSON.response.dnsServerDomain);

            var dnsServerLocalEndPoints = responseJSON.response.dnsServerLocalEndPoints;
            if (dnsServerLocalEndPoints == null) {
                $("#txtDnsServerLocalEndPoints").val("0.0.0.0:53\r\n[::]:53");
            }
            else {
                var value = "";

                for (var i = 0; i < dnsServerLocalEndPoints.length; i++)
                    value += dnsServerLocalEndPoints[i] + "\r\n";

                $("#txtDnsServerLocalEndPoints").val(value);
            }

            var webServiceLocalAddresses = responseJSON.response.webServiceLocalAddresses;
            if (webServiceLocalAddresses == null) {
                $("#txtWebServiceLocalAddresses").val("0.0.0.0\r\n[::]");
            }
            else {
                var value = "";

                for (var i = 0; i < webServiceLocalAddresses.length; i++)
                    value += webServiceLocalAddresses[i] + "\r\n";

                $("#txtWebServiceLocalAddresses").val(value);
            }

            $("#txtWebServiceHttpPort").val(responseJSON.response.webServiceHttpPort);

            $("#chkWebServiceEnableTls").prop("checked", responseJSON.response.webServiceEnableTls);
            $("#chkWebServiceHttpToTlsRedirect").prop("disabled", !responseJSON.response.webServiceEnableTls);
            $("#txtWebServiceTlsPort").prop("disabled", !responseJSON.response.webServiceEnableTls);
            $("#txtWebServiceTlsCertificatePath").prop("disabled", !responseJSON.response.webServiceEnableTls);
            $("#txtWebServiceTlsCertificatePassword").prop("disabled", !responseJSON.response.webServiceEnableTls);

            $("#chkWebServiceHttpToTlsRedirect").prop("checked", responseJSON.response.webServiceHttpToTlsRedirect);
            $("#txtWebServiceTlsPort").val(responseJSON.response.webServiceTlsPort);
            $("#txtWebServiceTlsCertificatePath").val(responseJSON.response.webServiceTlsCertificatePath);

            if (responseJSON.response.webServiceTlsCertificatePath == null)
                $("#txtWebServiceTlsCertificatePassword").val("");
            else
                $("#txtWebServiceTlsCertificatePassword").val(responseJSON.response.webServiceTlsCertificatePassword);

            $("#chkEnableDnsOverHttp").prop("checked", responseJSON.response.enableDnsOverHttp);
            $("#chkEnableDnsOverTls").prop("checked", responseJSON.response.enableDnsOverTls);
            $("#chkEnableDnsOverHttps").prop("checked", responseJSON.response.enableDnsOverHttps);

            $("#txtDnsTlsCertificatePath").prop("disabled", !responseJSON.response.enableDnsOverTls && !responseJSON.response.enableDnsOverHttps);
            $("#txtDnsTlsCertificatePassword").prop("disabled", !responseJSON.response.enableDnsOverTls && !responseJSON.response.enableDnsOverHttps);

            $("#txtDnsTlsCertificatePath").val(responseJSON.response.dnsTlsCertificatePath);

            if (responseJSON.response.dnsTlsCertificatePath == null)
                $("#txtDnsTlsCertificatePassword").val("");
            else
                $("#txtDnsTlsCertificatePassword").val(responseJSON.response.dnsTlsCertificatePassword);

            $("#chkPreferIPv6").prop("checked", responseJSON.response.preferIPv6);

            $("#chkEnableLogging").prop("checked", responseJSON.response.enableLogging);
            $("#chkLogQueries").prop("disabled", !responseJSON.response.enableLogging);
            $("#chkUseLocalTime").prop("disabled", !responseJSON.response.enableLogging);
            $("#txtLogFolderPath").prop("disabled", !responseJSON.response.enableLogging);
            $("#chkLogQueries").prop("checked", responseJSON.response.logQueries);
            $("#chkUseLocalTime").prop("checked", responseJSON.response.useLocalTime);
            $("#txtLogFolderPath").val(responseJSON.response.logFolder);
            $("#txtMaxLogFileDays").val(responseJSON.response.maxLogFileDays);

            $("#chkAllowRecursion").prop("checked", responseJSON.response.allowRecursion);
            $("#chkAllowRecursionOnlyForPrivateNetworks").prop('disabled', !responseJSON.response.allowRecursion);
            $("#chkAllowRecursionOnlyForPrivateNetworks").prop("checked", responseJSON.response.allowRecursionOnlyForPrivateNetworks);
            $("#chkRandomizeName").prop("checked", responseJSON.response.randomizeName);

            $("#chkServeStale").prop("checked", responseJSON.response.serveStale);
            $("#txtServeStaleTtl").prop("disabled", !responseJSON.response.serveStale);
            $("#txtServeStaleTtl").val(responseJSON.response.serveStaleTtl);

            $("#txtCachePrefetchEligibility").val(responseJSON.response.cachePrefetchEligibility);
            $("#txtCachePrefetchTrigger").val(responseJSON.response.cachePrefetchTrigger);
            $("#txtCachePrefetchSampleIntervalInMinutes").val(responseJSON.response.cachePrefetchSampleIntervalInMinutes);
            $("#txtCachePrefetchSampleEligibilityHitsPerHour").val(responseJSON.response.cachePrefetchSampleEligibilityHitsPerHour);

            var proxy = responseJSON.response.proxy;
            if (proxy === null) {
                $("#rdProxyTypeNone").prop("checked", true);

                $("#txtProxyAddress").prop("disabled", true);
                $("#txtProxyPort").prop("disabled", true);
                $("#txtProxyUsername").prop("disabled", true);
                $("#txtProxyPassword").prop("disabled", true);
                $("#txtProxyBypassList").prop("disabled", true);

                $("#txtProxyAddress").val("");
                $("#txtProxyPort").val("");
                $("#txtProxyUsername").val("");
                $("#txtProxyPassword").val("");
                $("#txtProxyBypassList").val("");
            }
            else {
                switch (proxy.type.toLowerCase()) {
                    case "http":
                        $("#rdProxyTypeHttp").prop("checked", true);
                        break;

                    case "socks5":
                        $("#rdProxyTypeSocks5").prop("checked", true);
                        break;

                    default:
                        $("#rdProxyTypeNone").prop("checked", true);
                        break;
                }

                $("#txtProxyAddress").val(proxy.address);
                $("#txtProxyPort").val(proxy.port);
                $("#txtProxyUsername").val(proxy.username);
                $("#txtProxyPassword").val(proxy.password);

                {
                    var value = "";

                    for (var i = 0; i < proxy.bypass.length; i++)
                        value += proxy.bypass[i] + "\r\n";

                    $("#txtProxyBypassList").val(value);
                }

                $("#txtProxyAddress").prop("disabled", false);
                $("#txtProxyPort").prop("disabled", false);
                $("#txtProxyUsername").prop("disabled", false);
                $("#txtProxyPassword").prop("disabled", false);
                $("#txtProxyBypassList").prop("disabled", false);
            }

            var forwarders = responseJSON.response.forwarders;
            if (forwarders == null) {
                $("#txtForwarders").val("");
            }
            else {
                var value = "";

                for (var i = 0; i < forwarders.length; i++)
                    value += forwarders[i] + "\r\n";

                $("#txtForwarders").val(value);
            }

            $("#optQuickForwarders").val("blank");

            switch (responseJSON.response.forwarderProtocol.toLowerCase()) {
                case "tcp":
                    $("#rdForwarderProtocolTcp").prop("checked", true);
                    break;

                case "tls":
                    $("#rdForwarderProtocolTls").prop("checked", true);
                    break;

                case "https":
                    $("#rdForwarderProtocolHttps").prop("checked", true);
                    break;

                case "httpsjson":
                    $("#rdForwarderProtocolHttpsJson").prop("checked", true);
                    break;

                default:
                    $("#rdForwarderProtocolUdp").prop("checked", true);
                    break;
            }

            var blockListUrls = responseJSON.response.blockListUrls;
            if (blockListUrls == null) {
                $("#txtBlockListUrls").val("");
            }
            else {
                var value = "";

                for (var i = 0; i < blockListUrls.length; i++)
                    value += blockListUrls[i] + "\r\n";

                $("#txtBlockListUrls").val(value);
            }

            $("#optQuickBlockList").val("blank");

            //fix custom block list url in case port changes
            {
                var optCustomLocalBlockList = $("#optCustomLocalBlockList");

                optCustomLocalBlockList.attr("value", "http://localhost:" + responseJSON.response.webServiceHttpPort + "/blocklist.txt");
                optCustomLocalBlockList.text("Custom Local Block List (http://localhost:" + responseJSON.response.webServiceHttpPort + "/blocklist.txt)");
            }

            $("#txtBlockListUpdateIntervalHours").val(responseJSON.response.blockListUpdateIntervalHours);
            $("#lblBlockListNextUpdatedOn").text(responseJSON.response.blockListNextUpdatedOn);

            divDnsSettingsLoader.hide();
            divDnsSettings.show();
        },
        invalidToken: function () {
            showPageLogin();
        },
        objLoaderPlaceholder: divDnsSettingsLoader
    });

    return false;
}

function saveDnsSettings() {

    var dnsServerDomain = $("#txtDnsServerDomain").val();

    if ((dnsServerDomain === null) || (dnsServerDomain === "")) {
        showAlert("warning", "Missing!", "Please enter server domain name.");
        $("#txtDnsServerDomain").focus();
        return false;
    }

    var dnsServerLocalEndPoints = cleanTextList($("#txtDnsServerLocalEndPoints").val());

    if ((dnsServerLocalEndPoints.length === 0) || (dnsServerLocalEndPoints === ","))
        dnsServerLocalEndPoints = "0.0.0.0:53,[::]:53";
    else
        $("#txtDnsServerLocalEndPoints").val(dnsServerLocalEndPoints.replace(/,/g, "\n"));

    var webServiceLocalAddresses = cleanTextList($("#txtWebServiceLocalAddresses").val());

    if ((webServiceLocalAddresses.length === 0) || (webServiceLocalAddresses === ","))
        webServiceLocalAddresses = "0.0.0.0,[::]";
    else
        $("#txtWebServiceLocalAddresses").val(webServiceLocalAddresses.replace(/,/g, "\n"));

    var webServiceHttpPort = $("#txtWebServiceHttpPort").val();

    if ((webServiceHttpPort === null) || (webServiceHttpPort === ""))
        webServiceHttpPort = 5380;

    var webServiceEnableTls = $("#chkWebServiceEnableTls").prop("checked");
    var webServiceHttpToTlsRedirect = $("#chkWebServiceHttpToTlsRedirect").prop("checked");
    var webServiceTlsPort = $("#txtWebServiceTlsPort").val();
    var webServiceTlsCertificatePath = $("#txtWebServiceTlsCertificatePath").val();
    var webServiceTlsCertificatePassword = $("#txtWebServiceTlsCertificatePassword").val();

    var enableDnsOverHttp = $("#chkEnableDnsOverHttp").prop('checked');
    var enableDnsOverTls = $("#chkEnableDnsOverTls").prop('checked');
    var enableDnsOverHttps = $("#chkEnableDnsOverHttps").prop('checked');
    var dnsTlsCertificatePath = $("#txtDnsTlsCertificatePath").val();
    var dnsTlsCertificatePassword = $("#txtDnsTlsCertificatePassword").val();

    var preferIPv6 = $("#chkPreferIPv6").prop('checked');

    var enableLogging = $("#chkEnableLogging").prop('checked');
    var logQueries = $("#chkLogQueries").prop('checked');
    var useLocalTime = $("#chkUseLocalTime").prop('checked');
    var logFolder = $("#txtLogFolderPath").val();
    var maxLogFileDays = $("#txtMaxLogFileDays").val();

    var allowRecursion = $("#chkAllowRecursion").prop('checked');
    var allowRecursionOnlyForPrivateNetworks = $("#chkAllowRecursionOnlyForPrivateNetworks").prop('checked');
    var randomizeName = $("#chkRandomizeName").prop('checked');

    var serveStale = $("#chkServeStale").prop("checked");
    var serveStaleTtl = $("#txtServeStaleTtl").val();

    var cachePrefetchEligibility = $("#txtCachePrefetchEligibility").val();
    if ((cachePrefetchEligibility === null) || (cachePrefetchEligibility === "")) {
        showAlert("warning", "Missing!", "Please enter cache prefetch eligibility value.");
        $("#txtCachePrefetchEligibility").focus();
        return false;
    }

    var cachePrefetchTrigger = $("#txtCachePrefetchTrigger").val();
    if ((cachePrefetchTrigger === null) || (cachePrefetchTrigger === "")) {
        showAlert("warning", "Missing!", "Please enter cache prefetch trigger value.");
        $("#txtCachePrefetchTrigger").focus();
        return false;
    }

    var cachePrefetchSampleIntervalInMinutes = $("#txtCachePrefetchSampleIntervalInMinutes").val();
    if ((cachePrefetchSampleIntervalInMinutes === null) || (cachePrefetchSampleIntervalInMinutes === "")) {
        showAlert("warning", "Missing!", "Please enter cache auto prefetch sample interval value.");
        $("#txtCachePrefetchSampleIntervalInMinutes").focus();
        return false;
    }

    var cachePrefetchSampleEligibilityHitsPerHour = $("#txtCachePrefetchSampleEligibilityHitsPerHour").val();
    if ((cachePrefetchSampleEligibilityHitsPerHour === null) || (cachePrefetchSampleEligibilityHitsPerHour === "")) {
        showAlert("warning", "Missing!", "Please enter cache auto prefetch sample eligibility value.");
        $("#txtCachePrefetchSampleEligibilityHitsPerHour").focus();
        return false;
    }

    var proxy;
    var proxyType = $('input[name=rdProxyType]:checked').val().toLowerCase();
    if (proxyType === "none") {
        proxy = "&proxyType=" + proxyType;
    }
    else {
        var proxyAddress = $("#txtProxyAddress").val();

        if ((proxyAddress === null) || (proxyAddress === "")) {
            showAlert("warning", "Missing!", "Please enter proxy server address.");
            $("#txtProxyAddress").focus();
            return false;
        }

        var proxyPort = $("#txtProxyPort").val();

        if ((proxyPort === null) || (proxyPort === "")) {
            showAlert("warning", "Missing!", "Please enter proxy server port.");
            $("#txtProxyPort").focus();
            return false;
        }

        var proxyBypass = cleanTextList($("#txtProxyBypassList").val());

        if ((proxyBypass.length === 0) || (proxyBypass === ","))
            proxyBypass = "";
        else
            $("#txtProxyBypassList").val(proxyBypass.replace(/,/g, "\n"));

        proxy = "&proxyType=" + proxyType + "&proxyAddress=" + encodeURIComponent(proxyAddress) + "&proxyPort=" + proxyPort + "&proxyUsername=" + encodeURIComponent($("#txtProxyUsername").val()) + "&proxyPassword=" + encodeURIComponent($("#txtProxyPassword").val()) + "&proxyBypass=" + encodeURIComponent(proxyBypass);
    }

    var forwarders = cleanTextList($("#txtForwarders").val());

    if ((forwarders.length === 0) || (forwarders === ","))
        forwarders = false;
    else
        $("#txtForwarders").val(forwarders.replace(/,/g, "\n"));

    var forwarderProtocol = $('input[name=rdForwarderProtocol]:checked').val();

    var blockListUrls = cleanTextList($("#txtBlockListUrls").val());

    if ((blockListUrls.length === 0) || (blockListUrls === ","))
        blockListUrls = false;
    else
        $("#txtBlockListUrls").val(blockListUrls.replace(/,/g, "\n") + "\n");

    var blockListUpdateIntervalHours = $("#txtBlockListUpdateIntervalHours").val();

    var btn = $("#btnSaveDnsSettings").button('loading');

    HTTPRequest({
        url: "/api/setDnsSettings?token=" + token + "&dnsServerDomain=" + dnsServerDomain + "&dnsServerLocalEndPoints=" + encodeURIComponent(dnsServerLocalEndPoints)
            + "&webServiceLocalAddresses=" + encodeURIComponent(webServiceLocalAddresses) + "&webServiceHttpPort=" + webServiceHttpPort + "&webServiceEnableTls=" + webServiceEnableTls + "&webServiceHttpToTlsRedirect=" + webServiceHttpToTlsRedirect + "&webServiceTlsPort=" + webServiceTlsPort + "&webServiceTlsCertificatePath=" + encodeURIComponent(webServiceTlsCertificatePath) + "&webServiceTlsCertificatePassword=" + encodeURIComponent(webServiceTlsCertificatePassword)
            + "&enableDnsOverHttp=" + enableDnsOverHttp + "&enableDnsOverTls=" + enableDnsOverTls + "&enableDnsOverHttps=" + enableDnsOverHttps + "&dnsTlsCertificatePath=" + encodeURIComponent(dnsTlsCertificatePath) + "&dnsTlsCertificatePassword=" + encodeURIComponent(dnsTlsCertificatePassword)
            + "&preferIPv6=" + preferIPv6 + "&enableLogging=" + enableLogging + "&logQueries=" + logQueries + "&useLocalTime=" + useLocalTime + "&logFolder=" + encodeURIComponent(logFolder) + "&maxLogFileDays=" + maxLogFileDays
            + "&allowRecursion=" + allowRecursion + "&allowRecursionOnlyForPrivateNetworks=" + allowRecursionOnlyForPrivateNetworks + "&randomizeName=" + randomizeName
            + "&serveStale=" + serveStale + "&serveStaleTtl=" + serveStaleTtl + "&cachePrefetchEligibility=" + cachePrefetchEligibility + "&cachePrefetchTrigger=" + cachePrefetchTrigger + "&cachePrefetchSampleIntervalInMinutes=" + cachePrefetchSampleIntervalInMinutes + "&cachePrefetchSampleEligibilityHitsPerHour=" + cachePrefetchSampleEligibilityHitsPerHour
            + proxy + "&forwarders=" + encodeURIComponent(forwarders) + "&forwarderProtocol=" + forwarderProtocol + "&blockListUrls=" + encodeURIComponent(blockListUrls) + "&blockListUpdateIntervalHours=" + blockListUpdateIntervalHours,
        success: function (responseJSON) {
            document.title = responseJSON.response.dnsServerDomain + " - " + "Technitium DNS Server v" + responseJSON.response.version;
            $("#lblDnsServerDomain").text(" - " + responseJSON.response.dnsServerDomain);
            $("#txtDnsServerDomain").val(responseJSON.response.dnsServerDomain);

            //fix custom block list url in case port changes
            {
                var optCustomLocalBlockList = $("#optCustomLocalBlockList");

                optCustomLocalBlockList.attr("value", "http://localhost:" + responseJSON.response.webServiceHttpPort + "/blocklist.txt");
                optCustomLocalBlockList.text("Custom Local Block List (http://localhost:" + responseJSON.response.webServiceHttpPort + "/blocklist.txt)");
            }

            btn.button('reset');
            showAlert("success", "Settings Saved!", "DNS Server settings were saved successfully.");

            checkForWebConsoleRedirection(responseJSON);
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function checkForWebConsoleRedirection(responseJSON) {
    var hostname = window.location.hostname;

    var webServiceLocalAddresses = responseJSON.response.webServiceLocalAddresses;
    if (webServiceLocalAddresses != null) {
        for (var i = 0; i < webServiceLocalAddresses.length; i++) {
            if ((webServiceLocalAddresses[i] === "0.0.0.0") || (webServiceLocalAddresses[i] === "[::]") || (webServiceLocalAddresses[i] === window.location.hostname))
                break;

            hostname = webServiceLocalAddresses[i];
        }
    }

    if ((window.location.hostname != hostname) || ((window.location.port != responseJSON.response.webServiceHttpPort) && (window.location.port != responseJSON.response.webServiceTlsPort))) {
        window.open("http://" + hostname + ":" + responseJSON.response.webServiceHttpPort, "_self");
    }
}

function forceUpdateBlockLists() {
    if (!confirm("Are you sure to force download and update the block lists?"))
        return false;

    var btn = $("#btnUpdateBlockListsNow").button('loading');

    HTTPRequest({
        url: "/api/forceUpdateBlockLists?token=" + token,
        success: function (responseJSON) {
            btn.button('reset');
            showAlert("success", "Updating Block List!", "Block list update was triggered successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function cleanTextList(text) {
    text = text.replace(/\n/g, ",");

    while (text.indexOf(",,") !== -1) {
        text = text.replace(/,,/g, ",");
    }

    if (text.startsWith(","))
        text = text.substr(1);

    if (text.endsWith(","))
        text = text.substr(0, text.length - 1);

    return text;
}

function refreshDashboard(hideLoader) {

    if (!$("#mainPanelTabPaneDashboard").hasClass("active"))
        return;

    if (hideLoader == null)
        hideLoader = false;

    var divDashboardLoader = $("#divDashboardLoader");
    var divDashboard = $("#divDashboard");

    if (!hideLoader) {
        divDashboard.hide();
        divDashboardLoader.show();
    }

    var type = $('input[name=rdStatType]:checked').val();

    HTTPRequest({
        url: "/api/getStats?token=" + token + "&type=" + type,
        success: function (responseJSON) {

            //stats
            $("#divDashboardStatsTotalQueries").text(responseJSON.response.stats.totalQueries.toLocaleString());
            $("#divDashboardStatsTotalNoError").text(responseJSON.response.stats.totalNoError.toLocaleString());
            $("#divDashboardStatsTotalServerFailure").text(responseJSON.response.stats.totalServerFailure.toLocaleString());
            $("#divDashboardStatsTotalNameError").text(responseJSON.response.stats.totalNameError.toLocaleString());
            $("#divDashboardStatsTotalRefused").text(responseJSON.response.stats.totalRefused.toLocaleString());

            $("#divDashboardStatsTotalAuthHit").text(responseJSON.response.stats.totalAuthoritative.toLocaleString());
            $("#divDashboardStatsTotalRecursions").text(responseJSON.response.stats.totalRecursive.toLocaleString());
            $("#divDashboardStatsTotalCacheHit").text(responseJSON.response.stats.totalCached.toLocaleString());
            $("#divDashboardStatsTotalBlocked").text(responseJSON.response.stats.totalBlocked.toLocaleString());

            $("#divDashboardStatsTotalClients").text(responseJSON.response.stats.totalClients.toLocaleString());

            $("#divDashboardStatsZones").text(responseJSON.response.stats.zones.toLocaleString());
            $("#divDashboardStatsAllowedZones").text(responseJSON.response.stats.allowedZones.toLocaleString());
            $("#divDashboardStatsBlockedZones").text(responseJSON.response.stats.blockedZones.toLocaleString());
            $("#divDashboardStatsBlockListZones").text(responseJSON.response.stats.blockListZones.toLocaleString());

            if (responseJSON.response.stats.totalQueries > 0) {
                $("#divDashboardStatsTotalNoErrorPercentage").text((responseJSON.response.stats.totalNoError * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
                $("#divDashboardStatsTotalServerFailurePercentage").text((responseJSON.response.stats.totalServerFailure * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
                $("#divDashboardStatsTotalNameErrorPercentage").text((responseJSON.response.stats.totalNameError * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
                $("#divDashboardStatsTotalRefusedPercentage").text((responseJSON.response.stats.totalRefused * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");

                $("#divDashboardStatsTotalAuthHitPercentage").text((responseJSON.response.stats.totalAuthoritative * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
                $("#divDashboardStatsTotalRecursionsPercentage").text((responseJSON.response.stats.totalRecursive * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
                $("#divDashboardStatsTotalCacheHitPercentage").text((responseJSON.response.stats.totalCached * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
                $("#divDashboardStatsTotalBlockedPercentage").text((responseJSON.response.stats.totalBlocked * 100 / responseJSON.response.stats.totalQueries).toFixed(2) + "%");
            }
            else {
                $("#divDashboardStatsTotalNoErrorPercentage").text("0%");
                $("#divDashboardStatsTotalServerFailurePercentage").text("0%");
                $("#divDashboardStatsTotalNameErrorPercentage").text("0%");
                $("#divDashboardStatsTotalRefusedPercentage").text("0%");

                $("#divDashboardStatsTotalAuthHitPercentage").text("0%");
                $("#divDashboardStatsTotalRecursionsPercentage").text("0%");
                $("#divDashboardStatsTotalCacheHitPercentage").text("0%");
                $("#divDashboardStatsTotalBlockedPercentage").text("0%");
            }

            //main chart
            if (window.chartDashboardMain == null) {
                var contextDashboardMain = document.getElementById("canvasDashboardMain").getContext('2d');

                window.chartDashboardMain = new Chart(contextDashboardMain, {
                    type: 'line',
                    data: responseJSON.response.mainChartData,
                    options: {
                        elements: {
                            line: {
                                tension: 0.2,
                            }
                        },
                        scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true
                                }
                            }]
                        }
                    }
                });
            }
            else {
                window.chartDashboardMain.data = responseJSON.response.mainChartData;
                window.chartDashboardMain.update();
            }

            //query response chart
            if (window.chartDashboardPie == null) {
                var contextDashboardPie = document.getElementById("canvasDashboardPie").getContext('2d');

                window.chartDashboardPie = new Chart(contextDashboardPie, {
                    type: 'doughnut',
                    data: responseJSON.response.queryResponseChartData
                });
            }
            else {
                window.chartDashboardPie.data = responseJSON.response.queryResponseChartData;
                window.chartDashboardPie.update();
            }

            //query type chart
            if (window.chartDashboardPie2 == null) {
                var contextDashboardPie2 = document.getElementById("canvasDashboardPie2").getContext('2d');

                window.chartDashboardPie2 = new Chart(contextDashboardPie2, {
                    type: 'doughnut',
                    data: responseJSON.response.queryTypeChartData
                });
            }
            else {
                window.chartDashboardPie2.data = responseJSON.response.queryTypeChartData;
                window.chartDashboardPie2.update();
            }

            //top clients
            {
                var tableHtmlRows;
                var topClients = responseJSON.response.topClients;

                if (topClients.length < 1) {
                    tableHtmlRows = "<tr><td colspan=\"2\" align=\"center\">No Data</td></tr>";
                }
                else {
                    tableHtmlRows = "";

                    for (var i = 0; i < topClients.length; i++) {
                        tableHtmlRows += "<tr><td>" + htmlEncode(topClients[i].name) + "<br />" + htmlEncode(topClients[i].domain) + "</td><td>" + topClients[i].hits.toLocaleString() + "</td></tr>";
                    }
                }

                $("#tableTopClients").html(tableHtmlRows);
            }

            //top domains
            {
                var tableHtmlRows;
                var topDomains = responseJSON.response.topDomains;

                if (topDomains.length < 1) {
                    tableHtmlRows = "<tr><td colspan=\"2\" align=\"center\">No Data</td></tr>";
                }
                else {
                    tableHtmlRows = "";

                    for (var i = 0; i < topDomains.length; i++) {
                        tableHtmlRows += "<tr><td>" + topDomains[i].name + "</td><td>" + topDomains[i].hits.toLocaleString() + "</td></tr>";
                    }
                }

                $("#tableTopDomains").html(tableHtmlRows);
            }

            //top blocked domains
            {
                var tableHtmlRows;
                var topBlockedDomains = responseJSON.response.topBlockedDomains;

                if (topBlockedDomains.length < 1) {
                    tableHtmlRows = "<tr><td colspan=\"2\" align=\"center\">No Data</td></tr>";
                }
                else {
                    tableHtmlRows = "";

                    for (var i = 0; i < topBlockedDomains.length; i++) {
                        tableHtmlRows += "<tr><td>" + topBlockedDomains[i].name + "</td><td>" + topBlockedDomains[i].hits.toLocaleString() + "</td></tr>";
                    }
                }

                $("#tableTopBlockedDomains").html(tableHtmlRows);
            }

            if (!hideLoader) {
                divDashboardLoader.hide();
                divDashboard.show();
            }
        },
        invalidToken: function () {
            showPageLogin();
        },
        objLoaderPlaceholder: divDashboardLoader,
        dontHideAlert: hideLoader
    });

    return false;
}

function showTopStats(statsType, limit) {
    var divTopStatsAlert = $("#divTopStatsAlert");
    var divTopStatsLoader = $("#divTopStatsLoader");

    $("#tableTopStatsClients").hide();
    $("#tableTopStatsDomains").hide();
    $("#tableTopStatsBlockedDomains").hide();
    divTopStatsLoader.show();

    switch (statsType) {
        case "TopClients":
            $("#lblTopStatsTitle").text("Top " + limit + " Clients");
            break;

        case "TopDomains":
            $("#lblTopStatsTitle").text("Top " + limit + " Domains");
            break;

        case "TopBlockedDomains":
            $("#lblTopStatsTitle").text("Top " + limit + " Blocked Domains");
            break;
    }

    $("#modalTopStats").modal("show");

    var type = $('input[name=rdStatType]:checked').val();

    HTTPRequest({
        url: "/api/getTopStats?token=" + token + "&type=" + type + "&statsType=" + statsType + "&limit=" + limit,
        success: function (responseJSON) {
            divTopStatsLoader.hide();

            if (responseJSON.response.topClients != null) {
                var tableHtmlRows;
                var topClients = responseJSON.response.topClients;

                if (topClients.length < 1) {
                    tableHtmlRows = "<tr><td colspan=\"2\" align=\"center\">No Data</td></tr>";
                }
                else {
                    tableHtmlRows = "";

                    for (var i = 0; i < topClients.length; i++) {
                        tableHtmlRows += "<tr><td>" + htmlEncode(topClients[i].name) + "<br />" + htmlEncode(topClients[i].domain) + "</td><td>" + topClients[i].hits.toLocaleString() + "</td></tr>";
                    }
                }

                $("#tbodyTopStatsClients").html(tableHtmlRows);
                $("#tableTopStatsClients").show();
            }
            else if (responseJSON.response.topDomains != null) {
                var tableHtmlRows;
                var topDomains = responseJSON.response.topDomains;

                if (topDomains.length < 1) {
                    tableHtmlRows = "<tr><td colspan=\"2\" align=\"center\">No Data</td></tr>";
                }
                else {
                    tableHtmlRows = "";

                    for (var i = 0; i < topDomains.length; i++) {
                        tableHtmlRows += "<tr><td>" + topDomains[i].name + "</td><td>" + topDomains[i].hits.toLocaleString() + "</td></tr>";
                    }
                }

                $("#tbodyTopStatsDomains").html(tableHtmlRows);
                $("#tableTopStatsDomains").show();
            }
            else if (responseJSON.response.topBlockedDomains != null) {
                var tableHtmlRows;
                var topBlockedDomains = responseJSON.response.topBlockedDomains;

                if (topBlockedDomains.length < 1) {
                    tableHtmlRows = "<tr><td colspan=\"2\" align=\"center\">No Data</td></tr>";
                }
                else {
                    tableHtmlRows = "";

                    for (var i = 0; i < topBlockedDomains.length; i++) {
                        tableHtmlRows += "<tr><td>" + topBlockedDomains[i].name + "</td><td>" + topBlockedDomains[i].hits.toLocaleString() + "</td></tr>";
                    }
                }

                $("#tbodyTopStatsBlockedDomains").html(tableHtmlRows);
                $("#tableTopStatsBlockedDomains").show();
            }

            $("#divTopStatsData").animate({ scrollTop: 0 }, "fast");
        },
        invalidToken: function () {
            showPageLogin();
        },
        objLoaderPlaceholder: divTopStatsLoader,
        objAlertPlaceholder: divTopStatsAlert
    });

    return false;
}

function flushDnsCache() {

    if (!confirm("Are you sure to flush the DNS Server cache?"))
        return false;

    var btn = $("#btnFlushDnsCache").button('loading');

    HTTPRequest({
        url: "/api/flushDnsCache?token=" + token,
        success: function (responseJSON) {
            btn.button('reset');
            showAlert("success", "Cache Flushed!", "DNS Server cache was flushed successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function deleteCachedZone() {

    var domain = $("#txtCachedZoneViewerTitle").text();

    if (!confirm("Are you sure you want to delete the cached zone '" + domain + "' and all its records?"))
        return false;

    var btn = $("#btnDeleteCachedZone").button('loading');

    HTTPRequest({
        url: "/api/deleteCachedZone?token=" + token + "&domain=" + domain,
        success: function (responseJSON) {
            refreshCachedZonesList(getParentDomain(domain), "up");

            btn.button('reset');
            showAlert("success", "Cached Zone Deleted!", "Cached zone was deleted successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function getParentDomain(domain) {

    if ((domain != null) && (domain != "")) {
        var parentDomain;
        var i = domain.indexOf(".");

        if (i == -1)
            parentDomain = "";
        else
            parentDomain = domain.substr(i + 1);

        return parentDomain;
    }

    return null;
}

function refreshCachedZonesList(domain, direction) {

    if (domain == null)
        domain = "";

    domain.toLowerCase();

    var lstCachedZones = $("#lstCachedZones");
    var divCachedZoneViewer = $("#divCachedZoneViewer");
    var preCachedZoneViewerBody = $("#preCachedZoneViewerBody");

    divCachedZoneViewer.hide();
    preCachedZoneViewerBody.hide();

    HTTPRequest({
        url: "/api/listCachedZones?token=" + token + "&domain=" + domain + ((direction == null) ? "" : "&direction=" + direction),
        success: function (responseJSON) {
            var newDomain = responseJSON.response.domain;
            var zones = responseJSON.response.zones;

            var list = "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshCachedZonesList('" + newDomain + "');\"><b>[refresh]</b></a></div>"

            var parentDomain = getParentDomain(newDomain);

            if (parentDomain != null)
                list += "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshCachedZonesList('" + parentDomain + "', 'up');\"><b>[up]</b></a></div>"

            for (var i = 0; i < zones.length; i++) {
                var zoneName = htmlEncode(zones[i]);

                list += "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshCachedZonesList('" + zoneName + "');\">" + zoneName + "</a></div>"
            }

            lstCachedZones.html(list);

            if (newDomain == "") {
                $("#txtCachedZoneViewerTitle").text("<ROOT>");
                $("#btnDeleteCachedZone").hide();
            }
            else {
                $("#txtCachedZoneViewerTitle").text(newDomain);

                if ((newDomain == "root-servers.net") || newDomain.endsWith(".root-servers.net"))
                    $("#btnDeleteCachedZone").hide();
                else
                    $("#btnDeleteCachedZone").show();
            }

            if (responseJSON.response.records.length > 0) {
                preCachedZoneViewerBody.text(JSON.stringify(responseJSON.response.records, null, 2));
                preCachedZoneViewerBody.show();
            }

            divCachedZoneViewer.show();
        },
        invalidToken: function () {
            showPageLogin();
        },
        error: function () {
            lstCachedZones.html("<div class=\"zone\"><a href=\"#\" onclick=\"return refreshCachedZonesList('" + domain + "');\"><b>[refresh]</b></a></div>");
        },
        objLoaderPlaceholder: lstCachedZones
    });

    return false;
}

function allowZone() {

    var domain = $("#txtAllowZone").val();

    if ((domain === null) || (domain === "")) {
        showAlert("warning", "Missing!", "Please enter a domain name to allow.");
        $("#txtAllowZone").focus();
        return false;
    }

    var btn = $("#btnAllowZone").button('loading');

    HTTPRequest({
        url: "/api/allowZone?token=" + token + "&domain=" + domain,
        success: function (responseJSON) {
            refreshAllowedZonesList(domain);

            $("#txtAllowZone").val("");
            btn.button('reset');

            showAlert("success", "Zone Allowed!", "Zone was allowed successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function deleteAllowedZone() {

    var domain = $("#txtAllowedZoneViewerTitle").text();

    if (!confirm("Are you sure you want to delete the allowed zone '" + domain + "'?"))
        return false;

    var btn = $("#btnDeleteAllowedZone").button('loading');

    HTTPRequest({
        url: "/api/deleteAllowedZone?token=" + token + "&domain=" + domain,
        success: function (responseJSON) {
            refreshAllowedZonesList(getParentDomain(domain), "up");

            btn.button('reset');
            showAlert("success", "Allowed Zone Deleted!", "Allowed zone was deleted successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function refreshAllowedZonesList(domain, direction) {

    if (domain == null)
        domain = "";

    domain.toLowerCase();

    var lstAllowedZones = $("#lstAllowedZones");
    var divAllowedZoneViewer = $("#divAllowedZoneViewer");
    var preAllowedZoneViewerBody = $("#preAllowedZoneViewerBody");

    divAllowedZoneViewer.hide();
    preAllowedZoneViewerBody.hide();

    HTTPRequest({
        url: "/api/listAllowedZones?token=" + token + "&domain=" + domain + ((direction == null) ? "" : "&direction=" + direction),
        success: function (responseJSON) {
            var newDomain = responseJSON.response.domain;
            var zones = responseJSON.response.zones;

            var list = "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshAllowedZonesList('" + newDomain + "');\"><b>[refresh]</b></a></div>"

            var parentDomain = getParentDomain(newDomain);

            if (parentDomain != null)
                list += "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshAllowedZonesList('" + parentDomain + "', 'up');\"><b>[up]</b></a></div>"

            for (var i = 0; i < zones.length; i++) {
                var zoneName = htmlEncode(zones[i]);

                list += "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshAllowedZonesList('" + zoneName + "');\">" + zoneName + "</a></div>"
            }

            lstAllowedZones.html(list);

            if (newDomain == "") {
                $("#txtAllowedZoneViewerTitle").text("<ROOT>");
                $("#btnDeleteAllowedZone").hide();
            }
            else {
                $("#txtAllowedZoneViewerTitle").text(newDomain);

                if ((newDomain == "root-servers.net") || newDomain.endsWith(".root-servers.net"))
                    $("#btnDeleteAllowedZone").hide();
                else
                    $("#btnDeleteAllowedZone").show();
            }

            if (responseJSON.response.records.length > 0) {
                preAllowedZoneViewerBody.text(JSON.stringify(responseJSON.response.records, null, 2));
                preAllowedZoneViewerBody.show();
            }

            divAllowedZoneViewer.show();
        },
        invalidToken: function () {
            showPageLogin();
        },
        error: function () {
            lstAllowedZones.html("<div class=\"zone\"><a href=\"#\" onclick=\"return refreshAllowedZonesList('" + domain + "');\"><b>[refresh]</b></a></div>");
        },
        objLoaderPlaceholder: lstAllowedZones
    });

    return false;
}

function blockZone() {

    var domain = $("#txtBlockZone").val();

    if ((domain === null) || (domain === "")) {
        showAlert("warning", "Missing!", "Please enter a domain name to block.");
        $("#txtBlockZone").focus();
        return false;
    }

    var btn = $("#btnBlockZone").button('loading');

    HTTPRequest({
        url: "/api/blockZone?token=" + token + "&domain=" + domain,
        success: function (responseJSON) {
            refreshBlockedZonesList(domain);

            $("#txtBlockZone").val("");
            btn.button('reset');

            showAlert("success", "Zone Blocked!", "Domain was added to Blocked Zone successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function deleteBlockedZone() {

    var domain = $("#txtBlockedZoneViewerTitle").text();

    if (!confirm("Are you sure you want to delete the blocked zone '" + domain + "'?"))
        return false;

    var btn = $("#btnDeleteBlockedZone").button('loading');

    HTTPRequest({
        url: "/api/deleteBlockedZone?token=" + token + "&domain=" + domain,
        success: function (responseJSON) {
            refreshBlockedZonesList(getParentDomain(domain), "up");

            btn.button('reset');
            showAlert("success", "Blocked Zone Deleted!", "Blocked zone was deleted successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function refreshBlockedZonesList(domain, direction) {

    if (domain == null)
        domain = "";

    domain.toLowerCase();

    var lstBlockedZones = $("#lstBlockedZones");
    var divBlockedZoneViewer = $("#divBlockedZoneViewer");
    var preBlockedZoneViewerBody = $("#preBlockedZoneViewerBody");

    divBlockedZoneViewer.hide();
    preBlockedZoneViewerBody.hide();

    HTTPRequest({
        url: "/api/listBlockedZones?token=" + token + "&domain=" + domain + ((direction == null) ? "" : "&direction=" + direction),
        success: function (responseJSON) {
            var newDomain = responseJSON.response.domain;
            var zones = responseJSON.response.zones;

            var list = "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshBlockedZonesList('" + newDomain + "');\"><b>[refresh]</b></a></div>"

            var parentDomain = getParentDomain(newDomain);

            if (parentDomain != null)
                list += "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshBlockedZonesList('" + parentDomain + "', 'up');\"><b>[up]</b></a></div>"

            for (var i = 0; i < zones.length; i++) {
                var zoneName = htmlEncode(zones[i]);

                list += "<div class=\"zone\"><a href=\"#\" onclick=\"return refreshBlockedZonesList('" + zoneName + "');\">" + zoneName + "</a></div>"
            }

            lstBlockedZones.html(list);

            if (newDomain == "") {
                $("#txtBlockedZoneViewerTitle").text("<ROOT>");
                $("#btnDeleteBlockedZone").hide();
            }
            else {
                $("#txtBlockedZoneViewerTitle").text(newDomain);

                if ((newDomain == "root-servers.net") || newDomain.endsWith(".root-servers.net"))
                    $("#btnDeleteBlockedZone").hide();
                else
                    $("#btnDeleteBlockedZone").show();
            }

            if (responseJSON.response.records.length > 0) {
                preBlockedZoneViewerBody.text(JSON.stringify(responseJSON.response.records, null, 2));
                preBlockedZoneViewerBody.show();
            }

            divBlockedZoneViewer.show();
        },
        invalidToken: function () {
            showPageLogin();
        },
        error: function () {
            lstBlockedZones.html("<div class=\"zone\"><a href=\"#\" onclick=\"return refreshBlockedZonesList('" + domain + "');\"><b>[refresh]</b></a></div>");
        },
        objLoaderPlaceholder: lstBlockedZones
    });

    return false;
}

function resolveQuery(importRecords) {

    if (importRecords == null)
        importRecords = false;

    var server = $("#txtDnsClientNameServer").val();

    if (server.indexOf("recursive-resolver") !== -1)
        $("#optDnsClientProtocol").val("UDP");

    var domain = $("#txtDnsClientDomain").val();
    var type = $("#optDnsClientType").val();
    var protocol = $("#optDnsClientProtocol").val();

    {
        var i = server.indexOf("{");
        if (i > -1) {
            var j = server.lastIndexOf("}");
            server = server.substring(i + 1, j);
        }
    }

    server = server.trim();

    if ((server === null) || (server === "")) {
        showAlert("warning", "Missing!", "Please enter a valid Name Server.");
        $("#txtDnsClientNameServer").focus();
        return false;
    }

    if ((domain === null) || (domain === "")) {
        showAlert("warning", "Missing!", "Please enter a domain name to query.");
        $("#txtDnsClientDomain").focus();
        return false;
    }

    {
        var i = domain.indexOf("://");
        if (i > -1) {
            var j = domain.indexOf(":", i + 3);

            if (j < 0)
                j = domain.indexOf("/", i + 3);

            if (j > -1)
                domain = domain.substring(i + 3, j);
            else
                domain = domain.substring(i + 3);

            $("#txtDnsClientDomain").val(domain);
        }
    }

    if (importRecords) {
        if (!confirm("Importing all the records from the result of this query will overwrite existing records in the zone '" + domain + "'.\n\nAre you sure you want to import all records?"))
            return false;
    }

    var btn = $(importRecords ? "#btnDnsClientImport" : "#btnDnsClientResolve").button('loading');
    var btnOther = $(importRecords ? "#btnDnsClientResolve" : "#btnDnsClientImport").prop("disabled", true);

    var divDnsClientLoader = $("#divDnsClientLoader");
    var preDnsClientOutput = $("#preDnsClientOutput");

    preDnsClientOutput.hide();
    divDnsClientLoader.show();

    HTTPRequest({
        url: "/api/resolveQuery?token=" + token + "&server=" + encodeURIComponent(server) + "&domain=" + encodeURIComponent(domain) + "&type=" + type + "&protocol=" + protocol + (importRecords ? "&import=true" : ""),
        success: function (responseJSON) {
            preDnsClientOutput.text(JSON.stringify(responseJSON.response.result, null, 2));

            preDnsClientOutput.show();
            divDnsClientLoader.hide();

            btn.button('reset');
            btnOther.prop("disabled", false);

            if (importRecords) {
                showAlert("success", "Records Imported!", "Resource records resolved by this DNS client query were successfully imported into this server.");
            }
        },
        error: function () {
            divDnsClientLoader.hide();
            btn.button('reset');
            btnOther.prop("disabled", false);
        },
        invalidToken: function () {
            divDnsClientLoader.hide();
            btn.button('reset');
            btnOther.prop("disabled", false);
            showPageLogin();
        },
        objLoaderPlaceholder: divDnsClientLoader,
        showInnerError: true
    });

    //add server name to list if doesnt exists
    var txtServerName = $("#txtDnsClientNameServer").val();
    var containsServer = false;

    $("#optDnsClientNameServers a").each(function () {
        if ($(this).html() === txtServerName)
            containsServer = true;
    });

    if (!containsServer)
        $("#optDnsClientNameServers").prepend('<li><a href="#" onclick="return false;">' + htmlEncode(txtServerName) + '</a></li>');

    return false;
}

function refreshLogFilesList() {

    var lstLogFiles = $("#lstLogFiles");

    HTTPRequest({
        url: "/api/listLogs?token=" + token,
        success: function (responseJSON) {
            var logFiles = responseJSON.response.logFiles;

            var list = "<div class=\"log\" style=\"font-size: 14px; padding-bottom: 6px;\"><a href=\"#\" onclick=\"return deleteAllStats();\"><b>[delete all stats]</b></a></div>";

            if (logFiles.length == 0) {
                list += "<div class=\"log\">No Log Was Found</div>";
            }
            else {
                list += "<div class=\"log\" style=\"font-size: 14px; padding-bottom: 6px;\"><a href=\"#\" onclick=\"return deleteAllLogs();\"><b>[delete all logs]</b></a></div>";

                for (var i = 0; i < logFiles.length; i++) {
                    var logFile = logFiles[i];

                    list += "<div class=\"log\"><a href=\"#\" onclick=\"return viewLog('" + logFile.fileName + "');\">" + logFile.fileName + " [" + logFile.size + "]</a></div>"
                }
            }

            lstLogFiles.html(list);
        },
        invalidToken: function () {
            showPageLogin();
        },
        objLoaderPlaceholder: lstLogFiles
    });

    return false;
}

function viewLog(logFile) {

    var divLogViewer = $("#divLogViewer");
    var txtLogViewerTitle = $("#txtLogViewerTitle");
    var divLogViewerLoader = $("#divLogViewerLoader");
    var preLogViewerBody = $("#preLogViewerBody");

    txtLogViewerTitle.text(logFile);

    preLogViewerBody.hide();
    divLogViewerLoader.show();
    divLogViewer.show();

    HTTPGetFileRequest({
        url: "/log/" + logFile + "?limit=2&token=" + token,
        success: function (response) {

            divLogViewerLoader.hide();

            preLogViewerBody.text(response);
            preLogViewerBody.show();
        },
        objLoaderPlaceholder: divLogViewerLoader
    });

    return false;
}

function downloadLog() {

    var logFile = $("#txtLogViewerTitle").text();

    window.open("/log/" + logFile + "?token=" + token + "&ts=" + (new Date().getTime()), "_blank");

    return false;
}

function deleteLog() {

    var logFile = $("#txtLogViewerTitle").text();

    if (!confirm("Are you sure you want to permanently delete the log file '" + logFile + "'?"))
        return false;

    var btn = $("#btnDeleteLog").button('loading');

    HTTPRequest({
        url: "/api/deleteLog?token=" + token + "&log=" + logFile,
        success: function (responseJSON) {
            refreshLogFilesList();

            $("#divLogViewer").hide();
            btn.button('reset');

            showAlert("success", "Log Deleted!", "Log file was deleted successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        }
    });

    return false;
}

function deleteAllLogs() {

    if (!confirm("Are you sure you want to permanently delete all log files?"))
        return false;

    HTTPRequest({
        url: "/api/deleteAllLogs?token=" + token,
        success: function (responseJSON) {
            refreshLogFilesList();

            $("#divLogViewer").hide();

            showAlert("success", "Logs Deleted!", "All log files were deleted successfully.");
        },
        invalidToken: function () {
            showPageLogin();
        }
    });

    return false;
}

function deleteAllStats() {

    if (!confirm("Are you sure you want to permanently delete all stats files?"))
        return false;

    HTTPRequest({
        url: "/api/deleteAllStats?token=" + token,
        success: function (responseJSON) {
            showAlert("success", "Stats Deleted!", "All stats files were deleted successfully.");
        },
        invalidToken: function () {
            showPageLogin();
        }
    });

    return false;
}

function resetImportAllowedZonesModal() {

    $("#divImportAllowedZonesAlert").html("");
    $("#txtImportAllowedZones").val("");

    return false;
}

function importAllowedZones() {
    var divImportAllowedZonesAlert = $("#divImportAllowedZonesAlert");
    var allowedZones = cleanTextList($("#txtImportAllowedZones").val());

    if ((allowedZones.length === 0) || (allowedZones === ",")) {
        showAlert("warning", "Missing!", "Please enter allowed zones to import.", divImportAllowedZonesAlert);
        $("#txtImportAllowedZones").focus();
        return false;
    }

    var btn = $("#btnImportAllowedZones").button('loading');

    HTTPRequest({
        url: "/api/importAllowedZones?token=" + token,
        data: "allowedZones=" + allowedZones,
        success: function (responseJSON) {
            $("#modalImportAllowedZones").modal("hide");
            btn.button('reset');

            showAlert("success", "Imported!", "Domain names were imported to allowed zone successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        },
        objAlertPlaceholder: divImportAllowedZonesAlert
    });

    return false;
}

function exportAllowedZones() {

    window.open("/api/exportAllowedZones?token=" + token, "_blank");

    showAlert("success", "Exported!", "Allowed zones were exported successfully.");

    return false;
}

function resetImportBlockedZonesModal() {

    $("#divImportBlockedZonesAlert").html("");
    $("#txtImportBlockedZones").val("");

    return false;
}

function importBlockedZones() {
    var divImportBlockedZonesAlert = $("#divImportBlockedZonesAlert");
    var blockedZones = cleanTextList($("#txtImportBlockedZones").val());

    if ((blockedZones.length === 0) || (blockedZones === ",")) {
        showAlert("warning", "Missing!", "Please enter blocked zones to import.", divImportBlockedZonesAlert);
        $("#txtImportBlockedZones").focus();
        return false;
    }

    var btn = $("#btnImportBlockedZones").button('loading');

    HTTPRequest({
        url: "/api/importBlockedZones?token=" + token,
        data: "blockedZones=" + blockedZones,
        success: function (responseJSON) {
            $("#modalImportBlockedZones").modal("hide");
            btn.button('reset');

            showAlert("success", "Imported!", "Domain names were imported to blocked zone successfully.");
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        },
        objAlertPlaceholder: divImportBlockedZonesAlert
    });

    return false;
}

function exportBlockedZones() {

    window.open("/api/exportBlockedZones?token=" + token, "_blank");

    showAlert("success", "Exported!", "Blocked zones were exported successfully.");

    return false;
}

function resetBackupSettingsModal() {
    $("#divBackupSettingsAlert").html("");

    $("#chkBackupDnsSettings").prop("checked", true);
    $("#chkBackupLogSettings").prop("checked", true);
    $("#chkBackupZones").prop("checked", true);
    $("#chkBackupAllowedZones").prop("checked", true);
    $("#chkBackupBlockedZones").prop("checked", true);
    $("#chkBackupScopes").prop("checked", true);
    $("#chkBackupStats").prop("checked", true);
    $("#chkBackupLogs").prop("checked", false);
    $("#chkBackupBlockLists").prop("checked", true);

    return false;
}

function backupSettings() {
    var divBackupSettingsAlert = $("#divBackupSettingsAlert");

    var blockLists = $("#chkBackupBlockLists").prop('checked');
    var logs = $("#chkBackupLogs").prop('checked');
    var scopes = $("#chkBackupScopes").prop('checked');
    var stats = $("#chkBackupStats").prop('checked');
    var zones = $("#chkBackupZones").prop('checked');
    var allowedZones = $("#chkBackupAllowedZones").prop('checked');
    var blockedZones = $("#chkBackupBlockedZones").prop('checked');
    var dnsSettings = $("#chkBackupDnsSettings").prop('checked');
    var logSettings = $("#chkBackupLogSettings").prop('checked');

    if (!blockLists && !logs && !scopes && !stats && !zones && !allowedZones && !blockedZones && !dnsSettings && !logSettings) {
        showAlert("warning", "Missing!", "Please select at least one item to backup.", divBackupSettingsAlert);
        return false;
    }

    window.open("/api/backupSettings?token=" + token + "&blockLists=" + blockLists + "&logs=" + logs + "&scopes=" + scopes + "&stats=" + stats + "&zones=" + zones + "&allowedZones=" + allowedZones + "&blockedZones=" + blockedZones + "&dnsSettings=" + dnsSettings + "&logSettings=" + logSettings + "&ts=" + (new Date().getTime()), "_blank");

    $("#modalBackupSettings").modal("hide");
    showAlert("success", "Backed Up!", "Settings were backed up successfully.");

    return false;
}

function resetRestoreSettingsModal() {
    $("#divRestoreSettingsAlert").html("");

    $("#fileBackupZip").val("");

    $("#chkRestoreDnsSettings").prop("checked", true);
    $("#chkRestoreLogSettings").prop("checked", true);
    $("#chkRestoreZones").prop("checked", true);
    $("#chkRestoreAllowedZones").prop("checked", true);
    $("#chkRestoreBlockedZones").prop("checked", true);
    $("#chkRestoreScopes").prop("checked", true);
    $("#chkRestoreStats").prop("checked", true);
    $("#chkRestoreLogs").prop("checked", false);
    $("#chkRestoreBlockLists").prop("checked", true);

    return false;
}

function restoreSettings() {
    var divRestoreSettingsAlert = $("#divRestoreSettingsAlert");

    var fileBackupZip = $("#fileBackupZip");

    if (fileBackupZip[0].files.length === 0) {
        showAlert("warning", "Missing!", "Please select a backup zip file to restore.", divRestoreSettingsAlert);
        fileBackupZip.focus();
        return false;
    }

    var blockLists = $("#chkRestoreBlockLists").prop('checked');
    var logs = $("#chkRestoreLogs").prop('checked');
    var scopes = $("#chkRestoreScopes").prop('checked');
    var stats = $("#chkRestoreStats").prop('checked');
    var zones = $("#chkRestoreZones").prop('checked');
    var allowedZones = $("#chkRestoreAllowedZones").prop('checked');
    var blockedZones = $("#chkRestoreBlockedZones").prop('checked');
    var dnsSettings = $("#chkRestoreDnsSettings").prop('checked');
    var logSettings = $("#chkRestoreLogSettings").prop('checked');

    if (!blockLists && !logs && !scopes && !stats && !zones && !allowedZones && !blockedZones && !dnsSettings && !logSettings) {
        showAlert("warning", "Missing!", "Please select at least one item to restore.", divRestoreSettingsAlert);
        return false;
    }

    var formData = new FormData();
    formData.append("fileBackupZip", $("#fileBackupZip")[0].files[0]);

    var btn = $("#btnRestoreSettings").button('loading');

    HTTPRequest({
        url: "/api/restoreSettings?token=" + token + "&blockLists=" + blockLists + "&logs=" + logs + "&scopes=" + scopes + "&stats=" + stats + "&zones=" + zones + "&allowedZones=" + allowedZones + "&blockedZones=" + blockedZones + "&dnsSettings=" + dnsSettings + "&logSettings=" + logSettings,
        data: formData,
        dataIsFormData: true,
        success: function (responseJSON) {
            document.title = responseJSON.response.dnsServerDomain + " - " + "Technitium DNS Server v" + responseJSON.response.version;
            $("#lblDnsServerDomain").text(" - " + responseJSON.response.dnsServerDomain);
            $("#txtDnsServerDomain").val(responseJSON.response.dnsServerDomain);

            $("#modalRestoreSettings").modal("hide");
            btn.button('reset');

            showAlert("success", "Restored!", "Settings were restored successfully.");

            checkForWebConsoleRedirection(responseJSON);
        },
        error: function () {
            btn.button('reset');
        },
        invalidToken: function () {
            btn.button('reset');
            showPageLogin();
        },
        objAlertPlaceholder: divRestoreSettingsAlert
    });

    return false;
}