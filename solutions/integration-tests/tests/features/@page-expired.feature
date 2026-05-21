Feature: Session expired page

  Scenario: Session timeout page via app channel
    Given I go to the journey initiator
    And I select the "strategic_app" channel
    And I go to the "Page expired" page
    Then the page looks as expected

  Scenario: Session timeout page via web channel
    Given I go to the journey initiator
    And I select the "web" channel
    And I go to the "Page expired" page
    Then the page looks as expected