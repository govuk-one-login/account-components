Feature: Page not found

  @postDeploy @failMobile
  Scenario: Visit a page which doesn't exist
    Given I go to the "Non-existent page" page
    And the page has finished loading
    Then the page looks as expected
    And the page meets our accessibility standards