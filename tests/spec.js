// Hypermasher end-to-end tests

// This isn't an Angular app, so tell Protractor not to wait for Angular
browser.ignoreSynchronization = true;

// Run tests against boot2docker ip
var testServer = 'http://192.168.59.103:8000';

describe('Homepage redirect', function() {
  it('should redirect to /hyperlapse', function() {
    browser.get(testServer);

    expect(browser.getCurrentUrl()).toEqual(testServer+'/hyperlapse');
  });
});

describe('Hypermasher homepage', function() {
  it('should have a title', function() {
    browser.get(testServer);

    expect(browser.getTitle()).toEqual('Hypermasher - a stream of the latest Hyperlapse videos set to chill music');
  });
});
