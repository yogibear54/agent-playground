#!/usr/bin/env php
<?php

declare(strict_types=1);

use SampleAgent\AgentDaemon;

require dirname(__DIR__) . '/vendor/autoload.php';

$daemon = new AgentDaemon();
$daemon->run();
